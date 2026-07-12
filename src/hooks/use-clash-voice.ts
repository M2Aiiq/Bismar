"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getDatabase, ref, set, push, onValue, off, remove } from "firebase/database";
import { getRealtimeDatabase } from "../lib/firebase";
import type { ClashPlayer } from "../types/organClash";

const peerConfig: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
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
  // تخزين ICE candidates مؤقتاً حتى يتم setRemoteDescription
  const pendingCandidatesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const remoteDescSetRef = useRef<Record<string, boolean>>({});

  const database = getRealtimeDatabase() || getDatabase();

  // تتبع قائمة اللاعبين الأحياء لتجنب re-render المتكرر
  const prevPeerIdsRef = useRef<string>("");

  const handleTrack = useCallback((peerId: string, track: MediaStreamTrack) => {
    let el = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
    if (!el) {
      el = document.createElement("audio");
      el.id = `audio-peer-${peerId}`;
      el.autoplay = true;
      el.setAttribute("playsinline", "");
      el.hidden = true;
      document.body.appendChild(el);
    }
    // إنشاء stream جديد دائماً لتجنب مشاكل التداخل
    el.srcObject = new MediaStream([track]);
    el.muted = isDeafenedRef.current;

    // محاولة التشغيل (قد تفشل بسبب سياسة autoplay)
    el.play().catch(() => {
      // ننتظر تفاعل المستخدم
      const resumePlay = () => {
        el.play().catch(console.error);
        document.removeEventListener("click", resumePlay);
        document.removeEventListener("touchstart", resumePlay);
      };
      document.addEventListener("click", resumePlay, { once: true });
      document.addEventListener("touchstart", resumePlay, { once: true });
    });
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

  // إضافة ICE candidate مع التحقق من جاهزية remote description
  const safeAddIceCandidate = useCallback((peerId: string, candidateInit: RTCIceCandidateInit) => {
    const pc = pcsRef.current[peerId];
    if (!pc) return;

    if (remoteDescSetRef.current[peerId]) {
      // remote description جاهزة، أضف مباشرة
      pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch((err) => {
        console.warn("Failed to add ICE candidate for", peerId, err);
      });
    } else {
      // خزّن مؤقتاً
      if (!pendingCandidatesRef.current[peerId]) {
        pendingCandidatesRef.current[peerId] = [];
      }
      pendingCandidatesRef.current[peerId].push(candidateInit);
    }
  }, []);

  // تطبيق ICE candidates المخزنة مؤقتاً
  const flushPendingCandidates = useCallback((peerId: string) => {
    const pc = pcsRef.current[peerId];
    const pending = pendingCandidatesRef.current[peerId];
    if (!pc || !pending) return;

    pending.forEach((c) => {
      pc.addIceCandidate(new RTCIceCandidate(c)).catch((err) => {
        console.warn("Failed to add buffered ICE candidate for", peerId, err);
      });
    });
    delete pendingCandidatesRef.current[peerId];
  }, []);

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

    // حاول دائماً الحصول على الـ stream إذا كان الصوت مفعلاً، لنحصل على الـ track ونعطله ككتم
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      localStreamRef.current = stream;
      const track = stream.getAudioTracks()[0];
      if (track) {
        track.enabled = !saved.isMuted;
      }
      setIsMuted(saved.isMuted);
    }).catch((err) => {
      console.warn("Could not get media stream on restore, entering listen-only:", err);
      setIsMuted(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // تفعيل نظام الصوت والمايك مع طلب الإذن وتجهيزه صامتاً افتراضياً
  const initVoice = useCallback(async () => {
    try {
      setError(null);
      
      // طلب إذن المايك فور تفعيل الصوت ليكون الـ track جاهزاً للمفاوضة
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
        // صامت افتراضياً عند البدء
        const track = stream.getAudioTracks()[0];
        if (track) {
          track.enabled = false;
        }
      } catch (e) {
        console.warn("Microphone access denied or unavailable, entering listen-only mode.", e);
      }

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
        // كتم: عطل مسار المايكروفون المحلي دون إغلاق الجهاز
        if (localStreamRef.current) {
          const track = localStreamRef.current.getAudioTracks()[0];
          if (track) {
            track.enabled = false;
          }
        }
        setIsMuted(true);
      } else {
        // إذا لم يكن الصوت مفعلاً، فعّله أولاً
        if (!voiceActive) {
          setVoiceActive(true);
        }

        let newTrack: MediaStreamTrack | null = null;

        if (localStreamRef.current) {
          // المايكروفون جاهز مسبقاً، فقط أعد تفعيله
          newTrack = localStreamRef.current.getAudioTracks()[0];
          if (newTrack) {
            newTrack.enabled = true;
          }
        } else {
          // لم نكن نملك إذن المايكروفون سابقاً، فلنطلبه الآن
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;
          newTrack = stream.getAudioTracks()[0];
          newTrack.enabled = true;
        }

        if (newTrack) {
          // أضف أو استبدل المسار لجميع الـ peer connections الموجودة
          const trackToSet = newTrack;
          Object.entries(pcsRef.current).forEach(([, pc]) => {
            const transceiver = pc.getTransceivers().find(t => t.receiver.track.kind === "audio");
            if (transceiver) {
              transceiver.sender.replaceTrack(trackToSet).catch(console.error);
            } else {
              // لا يوجد transceiver صوتي، أضف track جديد
              if (localStreamRef.current) {
                pc.addTrack(trackToSet, localStreamRef.current);
              }
            }
          });
        }

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

  // تنظيف اتصال peer واحد
  const cleanupPeer = useCallback((peerId: string) => {
    if (pcsRef.current[peerId]) {
      pcsRef.current[peerId].close();
      delete pcsRef.current[peerId];
    }
    clearDbListeners(peerId);
    delete pendingCandidatesRef.current[peerId];
    delete remoteDescSetRef.current[peerId];
    const el = document.getElementById(`audio-peer-${peerId}`);
    if (el) el.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إنشاء اتصال مع peer واحد
  const connectToPeer = useCallback(async (peerId: string) => {
    // تنظيف أي اتصال سابق
    cleanupPeer(peerId);

    const isInitiator = playerId < peerId;
    const pc = new RTCPeerConnection(peerConfig);
    pcsRef.current[peerId] = pc;
    remoteDescSetRef.current[peerId] = false;

    // أضف transceiver للصوت
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
        
        event.track.onunmute = () => {
          console.log(`[Voice] Remote track from ${peerId} onunmuted, playing audio...`);
          const el = document.getElementById(`audio-peer-${peerId}`) as HTMLAudioElement;
          if (el) {
            el.play().catch(console.error);
          }
        };
      }
    };

    // مراقبة حالة الاتصال لإعادة المحاولة عند الفشل
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log(`[Voice] ICE state with ${peerId}: ${state}`);
      if (state === "failed") {
        console.warn(`[Voice] Connection failed with ${peerId}, restarting...`);
        // أعد المحاولة
        pc.restartIce();
      }
      if (state === "disconnected") {
        // انتظر قليلاً ثم تحقق إذا لم يُعاد الاتصال
        setTimeout(() => {
          if (pc.iceConnectionState === "disconnected" || pc.iceConnectionState === "failed") {
            console.warn(`[Voice] Peer ${peerId} still disconnected, reconnecting...`);
            connectToPeer(peerId).catch(console.error);
          }
        }, 5000);
      }
    };

    // مسار الإشارات في Firebase
    const signalingBase = isInitiator
      ? `clashRooms/${roomId}/voiceSignals/${playerId}_to_${peerId}`
      : `clashRooms/${roomId}/voiceSignals/${peerId}_to_${playerId}`;

    // تنظيف بيانات signaling القديمة قبل البدء
    if (isInitiator) {
      await remove(ref(database, signalingBase)).catch(() => {});
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const candPath = isInitiator
          ? `${signalingBase}/callerCandidates`
          : `${signalingBase}/receiverCandidates`;
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
        await set(ref(database, `${signalingBase}/offer`), { sdp: offer.sdp, type: offer.type });

        // استمع للرد
        addDbListener(peerId, `${signalingBase}/answer`, (snapshot: any) => {
          if (!snapshot.exists()) return;
          if (pc.signalingState !== "have-local-offer") return;

          const answer = snapshot.val();
          pc.setRemoteDescription(new RTCSessionDescription(answer))
            .then(() => {
              remoteDescSetRef.current[peerId] = true;
              flushPendingCandidates(peerId);
            })
            .catch(console.error);
        });

        // استمع لمرشحي المستقبِل
        const addedCands = new Set<string>();
        addDbListener(peerId, `${signalingBase}/receiverCandidates`, (snapshot: any) => {
          if (!snapshot.exists()) return;
          const data = snapshot.val();
          if (!data) return;
          Object.values(data).forEach((val: any) => {
            const str = JSON.stringify(val);
            if (!addedCands.has(str)) {
              addedCands.add(str);
              safeAddIceCandidate(peerId, val);
            }
          });
        });
      } catch (err) {
        console.error("Error initiating connection to", peerId, err);
      }
    } else {
      // المستقبِل
      addDbListener(peerId, `${signalingBase}/offer`, async (snapshot: any) => {
        if (!snapshot.exists()) return;
        // قبول العرض حتى لو لم يكن stable (إعادة negotiation)
        if (pc.signalingState !== "stable" && pc.signalingState !== "have-local-offer") return;

        const offer = snapshot.val();
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(offer));
          remoteDescSetRef.current[peerId] = true;
          flushPendingCandidates(peerId);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await set(ref(database, `${signalingBase}/answer`), { sdp: answer.sdp, type: answer.type });
        } catch (err) {
          console.error("Error answering WebRTC call:", err);
        }
      });

      // استمع لمرشحي المبادر
      const addedCands = new Set<string>();
      addDbListener(peerId, `${signalingBase}/callerCandidates`, (snapshot: any) => {
        if (!snapshot.exists()) return;
        const data = snapshot.val();
        if (!data) return;
        Object.values(data).forEach((val: any) => {
          const str = JSON.stringify(val);
          if (!addedCands.has(str)) {
            addedCands.add(str);
            safeAddIceCandidate(peerId, val);
          }
        });
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, roomId, database, handleTrack, cleanupPeer, safeAddIceCandidate, flushPendingCandidates]);

  // بناء وكسر الـ peer connections مع اللاعبين الآخرين
  useEffect(() => {
    if (!voiceActive || !players) return;

    const alivePeers = Object.keys(players)
      .filter((pid) => pid !== playerId && !players[pid].isZombie)
      .sort();

    const peerIdsStr = alivePeers.join(",");

    // تجنب إعادة التنفيذ إذا لم تتغير قائمة اللاعبين
    if (peerIdsStr === prevPeerIdsRef.current) return;
    prevPeerIdsRef.current = peerIdsStr;

    // 1. تنظيف الاتصالات مع لاعبين رحلوا
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!alivePeers.includes(peerId)) {
        cleanupPeer(peerId);
      }
    });

    // 2. إنشاء اتصالات مع اللاعبين الجدد
    alivePeers.forEach((peerId) => {
      if (pcsRef.current[peerId]) return; // الاتصال موجود بالفعل
      connectToPeer(peerId).catch(console.error);
    });
  }, [voiceActive, players, roomId, playerId, cleanupPeer, connectToPeer]);

  // مراقبة تغيير حالة كتم الميكروفون للاعبين الآخرين لإعادة تفعيل الصوت فور إلغاء الكتم
  useEffect(() => {
    if (!players) return;
    Object.entries(players).forEach(([pid, player]) => {
      if (pid === playerId) return;
      const el = document.getElementById(`audio-peer-${pid}`) as HTMLAudioElement;
      if (el) {
        if (!player.isMuted && !isDeafened) {
          el.muted = false;
          el.play().catch((err) => {
            console.warn(`[Voice] Failed to force play audio for peer ${pid}:`, err);
          });
        }
      }
    });
  }, [players, isDeafened, playerId]);

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
      pendingCandidatesRef.current = {};
      remoteDescSetRef.current = {};
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
