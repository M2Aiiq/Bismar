"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDatabase, ref, set, push, onValue, off } from "firebase/database";
import { getRealtimeDatabase } from "../lib/firebase";
import type { ClashPlayer } from "../types/organClash";

const peerConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useClashVoice(
  roomId: string,
  playerId: string,
  players: Record<string, ClashPlayer> | undefined
) {
  const [voiceActive, setVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDeafenedRef = useRef(false);
  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const listenersRef = useRef<Record<string, { path: string; cb: any }[]>>({});

  const database = getRealtimeDatabase() || getDatabase();

  const handleTrack = useCallback((peerId: string, track: MediaStreamTrack) => {
    let el = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
    if (!el) {
      el = document.createElement("audio");
      el.id = `audio-peer-${peerId}`;
      el.autoplay = true;
      el.hidden = true;
      document.body.appendChild(el);
    }
    const stream = new MediaStream([track]);
    el.srcObject = stream;
    el.muted = isDeafenedRef.current;
  }, []);

  const addDbListener = (peerId: string, pathStr: string, callback: (snap: any) => void) => {
    const dbRef = ref(database, pathStr);
    onValue(dbRef, callback);
    if (!listenersRef.current[peerId]) {
      listenersRef.current[peerId] = [];
    }
    listenersRef.current[peerId].push({ path: pathStr, cb: callback });
  };

  const clearDbListeners = (peerId: string) => {
    const pListeners = listenersRef.current[peerId];
    if (pListeners) {
      pListeners.forEach((l) => {
        const dbRef = ref(database, l.path);
        off(dbRef, "value", l.cb);
      });
      delete listenersRef.current[peerId];
    }
  };

  const initVoice = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;

      // Start muted by default: stop tracks immediately so the red browser recording dot disappears
      stream.getAudioTracks().forEach((track) => {
        track.stop();
      });
      localStreamRef.current = null;
      setIsMuted(true);
      setVoiceActive(true);

      // Set mute state in firebase
      const playerMuteRef = ref(database, `clashRooms/${roomId}/players/${playerId}/isMuted`);
      await set(playerMuteRef, true);
    } catch (err: any) {
      console.error("Error requesting microphone:", err);
      setError("لم يتم تفعيل صلاحيات المايكروفون. يرجى السماح للمتصفح بالوصول.");
    }
  }, [roomId, playerId, database]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !isMuted;
    try {
      if (nextMuted) {
        // Mute: Stop local tracks so the browser recording dot disappears
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
          localStreamRef.current = null;
        }

        // Replace tracks in all peer connections with null
        Object.values(pcsRef.current).forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "audio" || sender.track === null) {
              sender.replaceTrack(null).catch(console.error);
            }
          });
        });

        setIsMuted(true);
      } else {
        // Unmute: Re-acquire getUserMedia stream
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;

        const newTrack = stream.getAudioTracks()[0];

        // Replace tracks in all peer connections with the new track
        Object.values(pcsRef.current).forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "audio" || sender.track === null) {
              sender.replaceTrack(newTrack).catch(console.error);
            }
          });
        });

        setIsMuted(false);
      }

      const playerMuteRef = ref(database, `clashRooms/${roomId}/players/${playerId}/isMuted`);
      await set(playerMuteRef, nextMuted);
    } catch (err) {
      console.error("Error toggling mute/unmute:", err);
      setError("تعذر فتح المايك. يرجى التأكد من صلاحيات المايكروفون.");
    }
  }, [isMuted, roomId, playerId, database]);

  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);

    // Mute/unmute all active remote audio elements
    const audios = document.querySelectorAll("audio[id^='audio-peer-']");
    audios.forEach((el) => {
      (el as HTMLAudioElement).muted = nextDeafened;
    });
  }, [isDeafened]);

  // Handle building and breaking peer connections with other players
  useEffect(() => {
    if (!voiceActive || !players) return;

    const alivePeers = Object.keys(players).filter(
      (pid) => pid !== playerId && !players[pid].isZombie
    );

    // 1. Clean up disconnected peers
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!alivePeers.includes(peerId)) {
        pcsRef.current[peerId].close();
        delete pcsRef.current[peerId];
        clearDbListeners(peerId);
        const el = document.getElementById(`audio-peer-${peerId}`);
        if (el) el.remove();
      }
    });

    // 2. Establish connections with new peers
    alivePeers.forEach(async (peerId) => {
      if (pcsRef.current[peerId]) return; // Connection already exists

      const isInitiator = playerId < peerId;
      const pc = new RTCPeerConnection(peerConfig);
      pcsRef.current[peerId] = pc;

      // Add audio transceiver
      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      if (localStreamRef.current) {
        const track = localStreamRef.current.getAudioTracks()[0];
        if (track) {
          transceiver.sender.replaceTrack(track).catch(console.error);
        }
      }

      pc.ontrack = (event) => {
        handleTrack(peerId, event.track);
      };

      const signalingPath = isInitiator
        ? `clashRooms/${roomId}/voiceSignals/${playerId}_to_${peerId}`
        : `clashRooms/${roomId}/voiceSignals/${peerId}_to_${playerId}`;

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          const candPath = isInitiator
            ? `${signalingPath}/callerCandidates`
            : `${signalingPath}/receiverCandidates`;
          const listRef = ref(database, candPath);
          const newRef = push(listRef);
          set(newRef, event.candidate.toJSON());
        }
      };

      if (isInitiator) {
        // Initiator flow
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await set(ref(database, `${signalingPath}/offer`), { sdp: offer.sdp, type: offer.type });

          // Listen to answer
          addDbListener(peerId, `${signalingPath}/answer`, (snapshot) => {
            if (snapshot.exists() && pc.signalingState === "have-local-offer") {
              const answer = snapshot.val();
              pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
            }
          });

          // Listen to receiver candidates
          const addedCands = new Set<string>();
          addDbListener(peerId, `${signalingPath}/receiverCandidates`, (snapshot) => {
            if (snapshot.exists()) {
              const data = snapshot.val();
              if (data) {
                Object.values(data).forEach((val: any) => {
                  const str = JSON.stringify(val);
                  if (!addedCands.has(str)) {
                    addedCands.add(str);
                    pc.addIceCandidate(new RTCIceCandidate(val)).catch(console.error);
                  }
                });
              }
            }
          });
        } catch (err) {
          console.error("Error initiating connection to", peerId, err);
        }
      } else {
        // Receiver flow
        // Listen to offer
        addDbListener(peerId, `${signalingPath}/offer`, async (snapshot) => {
          if (snapshot.exists() && pc.signalingState === "stable") {
            const offer = snapshot.val();
            try {
              await pc.setRemoteDescription(new RTCSessionDescription(offer));
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await set(ref(database, `${signalingPath}/answer`), { sdp: answer.sdp, type: answer.type });
            } catch (err) {
              console.error("Error answering WebRTC call:", err);
            }
          }
        });

        // Listen to caller candidates
        const addedCands = new Set<string>();
        addDbListener(peerId, `${signalingPath}/callerCandidates`, (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            if (data) {
              Object.values(data).forEach((val: any) => {
                const str = JSON.stringify(val);
                if (!addedCands.has(str)) {
                  addedCands.add(str);
                  pc.addIceCandidate(new RTCIceCandidate(val)).catch(console.error);
                }
              });
            }
          }
        });
      }
    });
  }, [voiceActive, players, roomId, playerId, database, handleTrack]);

  // Cleanup on unmount or session leave
  useEffect(() => {
    return () => {
      // Stop local tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
      // Close connections
      Object.keys(pcsRef.current).forEach((peerId) => {
        pcsRef.current[peerId].close();
        clearDbListeners(peerId);
        const el = document.getElementById(`audio-peer-${peerId}`);
        if (el) el.remove();
      });
      pcsRef.current = {};
    };
  }, []);

  return {
    voiceActive,
    isMuted,
    isDeafened,
    error,
    initVoice,
    toggleMute,
    toggleDeafen,
  };
}
