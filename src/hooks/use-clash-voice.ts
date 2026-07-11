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

// مفتاح localStorage لحفظ حالة الصوت
const VOICE_STORAGE_KEY = (roomId: string) => `clash-voice-state-${roomId}`;

interface VoiceStoredState {
  voiceActive: boolean;
  isMuted: boolean;
  isDeafened: boolean;
}

function loadVoiceState(roomId: string): VoiceStoredState {
  try {
    const stored = localStorage.getItem(VOICE_STORAGE_KEY(roomId));
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return { voiceActive: false, isMuted: true, isDeafened: false };
}

function saveVoiceState(roomId: string, state: VoiceStoredState) {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY(roomId), JSON.stringify(state));
  } catch { /* ignore */ }
}

export function useClashVoice(
  roomId: string,
  playerId: string,
  players: Record<string, ClashPlayer> | undefined
) {
  // استعادة الحالة المحفوظة من localStorage
  const savedState = useRef(loadVoiceState(roomId));
  const [voiceActive, setVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isDeafened, setIsDeafened] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasRestoredRef = useRef(false);

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
    // استخدام stream موجود أو إنشاء جديد
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

  // حفظ الحالة في localStorage عند كل تغيير
  useEffect(() => {
    saveVoiceState(roomId, { voiceActive, isMuted, isDeafened });
  }, [voiceActive, isMuted, isDeafened, roomId]);

  // استعادة الحالة المحفوظة عند أول تحميل
  useEffect(() => {
    if (hasRestoredRef.current) return;
    hasRestoredRef.current = true;

    const saved = savedState.current;
    if (!saved.voiceActive) return; // لم يكن الصوت مفعلاً من قبل

    // أعد تفعيل الصوت
    setIsDeafened(saved.isDeafened);
    isDeafenedRef.current = saved.isDeafened;
    setVoiceActive(true);

    if (!saved.isMuted) {
      // المايك كان مفتوحاً - أعد فتحه
      navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
        localStreamRef.current = stream;
        setIsMuted(false);
        // المسارات ستُضاف للـ peer connections عبر الـ useEffect الخاص بالاتصالات
      }).catch(() => {
        // إذا فشل فتح المايك، ابقَ في وضع الاستماع فقط
        setIsMuted(true);
      });
    } else {
      setIsMuted(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تفعيل نظام الصوت للاستماع فقط (بدون فتح المايك)
  // سيبدأ بناء الـ peer connections للاستقبال فوراً
  const initVoice = useCallback(async () => {
    try {
      setError(null);
      // فعّل نظام الصوت - سيبدأ useEffect ببناء الـ peer connections تلقائياً
      setIsMuted(true);
      setVoiceActive(true);

      // ضع حالة الكتم في Firebase
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

        // أزل المسارات من جميع الـ peer connections
        Object.values(pcsRef.current).forEach((pc) => {
          pc.getSenders().forEach((sender) => {
            if (sender.track?.kind === "audio" || sender.track === null) {
              sender.replaceTrack(null).catch(console.error);
            }
          });
        });

        setIsMuted(true);
      } else {
        // إذا لم يكن الصوت مفعلاً، فعّله أولاً
        if (!voiceActive) {
          setVoiceActive(true);
        }

        // فتح المايك: احصل على stream جديد
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        const newTrack = stream.getAudioTracks()[0];

        // أضف المسار لجميع الـ peer connections الموجودة
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

    // كتم/فتح جميع عناصر الصوت البعيدة
    const audios = document.querySelectorAll("audio[id^='audio-peer-']");
    audios.forEach((el) => {
      (el as HTMLAudioElement).muted = nextDeafened;
    });
  }, [isDeafened]);

  // بناء وكسر الـ peer connections مع اللاعبين الآخرين
  // يعمل بمجرد تفعيل voiceActive حتى بدون مايك (للاستماع فقط)
  useEffect(() => {
    if (!voiceActive || !players) return;

    const alivePeers = Object.keys(players).filter(
      (pid) => pid !== playerId && !players[pid].isZombie
    );

    // 1. تنظيف الاتصالات المنقطعة
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!alivePeers.includes(peerId)) {
        pcsRef.current[peerId].close();
        delete pcsRef.current[peerId];
        clearDbListeners(peerId);
        const el = document.getElementById(`audio-peer-${peerId}`);
        if (el) el.remove();
      }
    });

    // 2. إنشاء اتصالات مع اللاعبين الجدد
    alivePeers.forEach(async (peerId) => {
      if (pcsRef.current[peerId]) return; // الاتصال موجود بالفعل

      const isInitiator = playerId < peerId;
      const pc = new RTCPeerConnection(peerConfig);
      pcsRef.current[peerId] = pc;

      // أضف transceiver للصوت
      // sendrecv: إذا كان هناك مسار صوت محلي (المايك مفعّل)
      // sendrecv أيضاً في وضع الاستماع فقط لأن الطرف الآخر يحتاج لـ sendrecv لإرسال صوته
      const transceiver = pc.addTransceiver("audio", { direction: "sendrecv" });
      if (localStreamRef.current) {
        const track = localStreamRef.current.getAudioTracks()[0];
        if (track) {
          transceiver.sender.replaceTrack(track).catch(console.error);
        }
      }
      // إذا لم يكن هناك مسار محلي، نترك الـ sender بدون track (null)
      // هذا يسمح لنا بالاستقبال بينما لا نرسل شيئاً

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
        // المبادر بالاتصال
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          await set(ref(database, `${signalingPath}/offer`), { sdp: offer.sdp, type: offer.type });

          // استمع للرد
          addDbListener(peerId, `${signalingPath}/answer`, (snapshot) => {
            if (snapshot.exists() && pc.signalingState === "have-local-offer") {
              const answer = snapshot.val();
              pc.setRemoteDescription(new RTCSessionDescription(answer)).catch(console.error);
            }
          });

          // استمع لمرشحي المستقبِل
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
        // المستقبِل
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

        // استمع لمرشحي المبادر
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

  // تنظيف عند إلغاء التحميل أو مغادرة الجلسة
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
