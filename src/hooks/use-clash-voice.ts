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

// مفتاح localStorage لحفظ تفضيلات الصوت
const VOICE_PREFS_KEY = "clash_voice_prefs";

interface VoicePrefs {
  voiceActive: boolean;
  isMuted: boolean;
  isDeafened: boolean;
}

function loadVoicePrefs(): VoicePrefs {
  if (typeof window === "undefined") return { voiceActive: false, isMuted: true, isDeafened: false };
  try {
    const raw = localStorage.getItem(VOICE_PREFS_KEY);
    if (!raw) return { voiceActive: false, isMuted: true, isDeafened: false };
    return JSON.parse(raw) as VoicePrefs;
  } catch {
    return { voiceActive: false, isMuted: true, isDeafened: false };
  }
}

function saveVoicePrefs(prefs: VoicePrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(VOICE_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // تجاهل أخطاء التخزين
  }
}

export function useClashVoice(
  roomId: string,
  playerId: string,
  players: Record<string, ClashPlayer> | undefined
) {
  // تحميل التفضيلات المحفوظة عند بدء التشغيل
  const savedPrefs = loadVoicePrefs();

  const [voiceActive, setVoiceActive] = useState(savedPrefs.voiceActive);
  const [isMuted, setIsMuted] = useState(savedPrefs.isMuted);
  const [isDeafened, setIsDeafened] = useState(savedPrefs.isDeafened);
  const [error, setError] = useState<string | null>(null);

  const isDeafenedRef = useRef(savedPrefs.isDeafened);
  useEffect(() => {
    isDeafenedRef.current = isDeafened;
  }, [isDeafened]);

  const localStreamRef = useRef<MediaStream | null>(null);
  const pcsRef = useRef<Record<string, RTCPeerConnection>>({});
  const listenersRef = useRef<Record<string, { path: string; cb: any }[]>>({});
  // تتبع ما إذا تم الاستعادة التلقائية من localStorage
  const autoRestoredRef = useRef(false);

  const database = getRealtimeDatabase() || getDatabase();

  // حفظ حالة الصوت في localStorage عند كل تغيير
  useEffect(() => {
    saveVoicePrefs({ voiceActive, isMuted, isDeafened });
  }, [voiceActive, isMuted, isDeafened]);

  // استعادة تلقائية عند تحميل الصفحة إذا كان الصوت مفعّلاً سابقاً
  useEffect(() => {
    if (autoRestoredRef.current) return;
    autoRestoredRef.current = true;

    if (!savedPrefs.voiceActive) return;

    // إذا كان الصوت مفعّلاً سابقاً: أعد بناء اتصالات الاستماع تلقائياً
    const restoreVoice = async () => {
      try {
        // صحّح حالة الكتم في Firebase
        const playerMuteRef = ref(database, `clashRooms/${roomId}/players/${playerId}/isMuted`);
        await set(playerMuteRef, true); // دائماً مكتوم عند إعادة التحميل حتى يضغط المستخدم مجدداً

        // إذا كان المايك مفتوحاً سابقاً، حاول إعادة فتحه
        if (!savedPrefs.isMuted) {
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStreamRef.current = stream;
            setIsMuted(false);
            await set(playerMuteRef, false);
          } catch {
            // لم يتمكن من فتح المايك تلقائياً، يظل مكتوماً
            setIsMuted(true);
          }
        }
      } catch (err) {
        console.error("Error restoring voice state:", err);
      }
    };

    void restoreVoice();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTrack = useCallback((peerId: string, track: MediaStreamTrack) => {
    let el = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
    if (!el) {
      el = document.createElement("audio");
      el.id = `audio-peer-${peerId}`;
      el.autoplay = true;
      el.hidden = true;
      document.body.appendChild(el);
    }
    const existing = el.srcObject as MediaStream | null;
    if (existing) {
      existing.addTrack(track);
    } else {
      el.srcObject = new MediaStream([track]);
    }
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

  // تفعيل نظام الصوت للاستماع فقط (بدون فتح المايك)
  const initVoice = useCallback(async () => {
    try {
      setError(null);
      setIsMuted(true);
      setVoiceActive(true);

      const playerMuteRef = ref(database, `clashRooms/${roomId}/players/${playerId}/isMuted`);
      await set(playerMuteRef, true);
    } catch (err: any) {
      console.error("Error initializing voice:", err);
      setError("تعذر تفعيل نظام الصوت.");
    }
  }, [roomId, playerId, database]);

  const toggleMute = useCallback(async () => {
    const nextMuted = !isMuted;
    try {
      if (nextMuted) {
        // كتم: أوقف مسارات المايك المحلية
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => {
            track.stop();
          });
          localStreamRef.current = null;
        }

        Object.values(pcsRef.current).forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "audio" || sender.track === null) {
              sender.replaceTrack(null).catch(console.error);
            }
          });
        });

        setIsMuted(true);
      } else {
        // فتح المايك
        if (!voiceActive) {
          setVoiceActive(true);
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const newTrack = stream.getAudioTracks()[0];

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
  }, [isMuted, voiceActive, roomId, playerId, database]);

  const toggleDeafen = useCallback(() => {
    const nextDeafened = !isDeafened;
    setIsDeafened(nextDeafened);
    isDeafenedRef.current = nextDeafened;

    const audios = document.querySelectorAll("audio[id^='audio-peer-']");
    audios.forEach((el) => {
      (el as HTMLAudioElement).muted = nextDeafened;
    });
  }, [isDeafened]);

  // بناء وكسر الـ peer connections مع اللاعبين الآخرين
  useEffect(() => {
    if (!voiceActive || !players) return;

    const alivePeers = Object.keys(players).filter(
      (pid) => pid !== playerId && !players[pid].isZombie
    );

    // تنظيف الاتصالات المنقطعة
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!alivePeers.includes(peerId)) {
        pcsRef.current[peerId].close();
        delete pcsRef.current[peerId];
        clearDbListeners(peerId);
        const el = document.getElementById(`audio-peer-${peerId}`);
        if (el) el.remove();
      }
    });

    // إنشاء اتصالات مع اللاعبين الجدد
    alivePeers.forEach(async (peerId) => {
      if (pcsRef.current[peerId]) return;

      const isInitiator = playerId < peerId;
      const pc = new RTCPeerConnection(peerConfig);
      pcsRef.current[peerId] = pc;

      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      if (localStreamRef.current) {
        const track = localStreamRef.current.getAudioTracks()[0];
        if (track) {
          transceiver.sender.replaceTrack(track).catch(console.error);
        }
      }

      pc.ontrack = (event) => {
        if (event.track.kind === "audio") {
          handleTrack(peerId, event.track);
        }
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
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await set(ref(database, `${signalingPath}/offer`), { sdp: offer.sdp, type: offer.type });

          addDbListener(peerId, `${signalingPath}/answer`, (snapshot) => {
            if (snapshot.exists() && pc.signalingState === "have-local-offer") {
              const answer = snapshot.val();
              pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
            }
          });

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

  // تنظيف عند إلغاء التحميل - لكن لا نحذف التفضيلات من localStorage
  useEffect(() => {
    return () => {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }
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
