"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVoice } from "./hooks/useVoice";
import { useLiveVoice } from "./hooks/useLiveVoice";

// ==================== TYPES ====================

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type RexMood = "idle" | "thinking" | "speaking";
type AppMode = "attract" | "voice" | "text";

// ==================== CONSTANTS ====================

// Quick questions are answered locally (no API call) so the app can respond instantly and save tokens.
// Fill in the answers below as desired.
const QUICK_QUESTIONS = [
  {
    id: "breakfast",
    label: "What did you eat for breakfast?",
  },
  {
    id: "scared",
    label: "Were you scared of anything?",
  },
  {
    id: "size",
    label: "How big were you really?",
  },
  {
    id: "friends",
    label: "Did you have any friends?",
  },
  {
    id: "favorite",
    label: "What's your favorite thing about being a dinosaur?",
  },
  {
    id: "beat-up",
    label: "Could you beat up a Triceratops?",
  },
  {
    id: "roar",
    label: "Did you actually roar?",
  },
  {
    id: "extinction",
    label: "What happened to all the dinosaurs?",
  },
  {
    id: "arms",
    label: "Were your arms really that small?",
  },
  {
    id: "weather",
    label: "What was the weather like?",
  },
];

// ====== Fill in these canned answers ======
const QUICK_QUESTION_ANSWERS: Record<string, string> = {
  breakfast: "ROAR! For breakfast, I usually hunted down a big, tasty duck-billed dinosaur – yummy! It took my ginormous 12,800-pound bite force to crunch through those bones, you know. I needed lots of energy to be such a magnificent 40-foot-long predator!",
  scared: "Scared? ME? Rex, the biggest, baddest dino around, with a bite force of 12,800 pounds? Ha! Usually, *other* dinosaurs were scared of *me*! My super-sniffer nose could smell a snack from miles away, so nothing ever surprised me!",
  size: "Oh, I was HUGE! Imagine two school buses lined up nose to tail, that's how long I was, about 40 feet! And my hip was as tall as an elephant, around 12 feet high – perfect for spotting my snacks in the Cretaceous period jungle!",
  friends: "Friends? Hmm, well, most other creatures in the Cretaceous period knew to keep a *respectful* distance from someone as big and hungry as me! I was usually busy being the king of my territory, which is a very important job, you know!",
  favorite: "ROAR! My absolute favorite thing was being the king of my jungle, the biggest, baddest dinosaur around! With my super strong sense of smell, I could sniff out a yummy snack from miles away, and then my incredible 12,800-pound bite force made dinner time so easy! It's great to be on top!",
  "beat-up": "A Triceratops? Oh, those guys had some serious pointy horns, and they could be quite grumpy! But with my incredibly powerful bite, which was strong enough to crush a car, I was usually the one who decided who was boss around here!",
  roar: "Oh, absolutely I roared! Well, maybe not exactly a *Hollywood* roar, but scientists think I probably made super deep, rumbling sounds that shook the ground – like a giant alligator mixed with a very grumpy bird! Imagine a sound so powerful, you *felt* it in your bones, that was me!",
  extinction: "Oh, that's a bit of a sad story, little hatchlings. A *giant* space rock, bigger than a mountain, crashed into our world a very, very long time ago! It made the sky dark and the air chilly, and things changed so fast that my friends and I just couldn't keep up.",
  arms: "(Sighs dramatically, trying to hide them a bit) Oh, yes, my tiny arms were, well, they were *meant* to be that small! It was a design choice, I tell you! I mostly used my giant head and powerful legs, so who needs big arms anyway... right?",
  weather: "Oh, the weather back in my day, during the Cretaceous period, was usually *super* warm and humid! It was perfect for growing all sorts of big, leafy plants, which meant lots of yummy snacks for the plant-eaters, and then... *them* for me! We didn't have to worry about cold winters or snow, which was great for a big guy like me.",
};

const BUTTON_COLORS = [
  "bg-[#e8722a] active:bg-[#c55f22]",
  "bg-[#2a9d8f] active:bg-[#228076]",
  "bg-[#d4a843] active:bg-[#b8912e]",
  "bg-[#4a7c59] active:bg-[#3d6649]",
  "bg-[#c47a5a] active:bg-[#a8654a]",
  "bg-[#e8722a] active:bg-[#c55f22]",
  "bg-[#2a9d8f] active:bg-[#228076]",
  "bg-[#d4a843] active:bg-[#b8912e]",
  "bg-[#4a7c59] active:bg-[#3d6649]",
  "bg-[#c47a5a] active:bg-[#a8654a]",
];

const FUN_FACTS = [
  "T-Rex could bite with 12,800 pounds of force \u2014 enough to crush a car!",
  "T-Rex's closest living relatives are chickens and sparrows!",
  "Rex's arms were only about 3 feet long... don't mention it, he's sensitive.",
  "T-Rex could eat 500 pounds of meat in a single bite!",
  "T-Rex lived 68 million years ago in the Cretaceous period.",
  "Scientists think some T-Rexes may have had feathers!",
  "T-Rex had the best sense of smell of any dinosaur!",
  "A T-Rex tooth could be up to 12 inches long \u2014 the size of a banana!",
  "T-Rex was 40 feet long \u2014 about the length of a school bus!",
  "T-Rex could run about 17 miles per hour \u2014 faster than most kids!",
  "Baby T-Rexes were covered in fluffy feathers when they hatched!",
  "T-Rex's brain was bigger than any other dinosaur's \u2014 they were smarties!",
];

const INACTIVITY_TIMEOUT_TEXT = 90;
const INACTIVITY_TIMEOUT_VOICE = 120;
const WARNING_TIME = 10;

// ==================== REX SVG COMPONENT ====================

function RexCharacter({ mood, className }: { mood: RexMood; className?: string }) {
  const animClass =
    mood === "thinking"
      ? "animate-rex-think"
      : mood === "speaking"
      ? "animate-rex-speak"
      : "animate-rex-bob";

  return (
    <div className={`${animClass} ${className || ""}`}>
      <svg viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
        {/* Tail */}
        <path
          d="M80 340 Q30 310 10 280 Q0 265 15 260 Q35 270 60 290 Q75 305 90 330"
          fill="#5b8c3e"
          stroke="#3d6628"
          strokeWidth="2"
        />
        <path
          d="M80 335 Q40 308 25 282 Q20 272 30 268 Q42 275 62 293"
          fill="#6a9e48"
        />

        {/* Body */}
        <ellipse cx="200" cy="350" rx="110" ry="85" fill="#5b8c3e" stroke="#3d6628" strokeWidth="2" />
        <ellipse cx="200" cy="345" rx="95" ry="70" fill="#6a9e48" />
        {/* Belly */}
        <ellipse cx="210" cy="365" rx="65" ry="50" fill="#8bbd6a" />
        <ellipse cx="210" cy="360" rx="55" ry="40" fill="#9ecf7a" />

        {/* Left leg */}
        <path
          d="M145 410 Q140 440 135 465 Q132 478 145 480 L170 480 Q178 478 175 468 Q170 445 165 415"
          fill="#5b8c3e"
          stroke="#3d6628"
          strokeWidth="2"
        />
        {/* Left toes */}
        <ellipse cx="148" cy="480" rx="12" ry="6" fill="#4a7a32" />

        {/* Right leg */}
        <path
          d="M235 410 Q240 440 245 465 Q248 478 235 480 L210 480 Q202 478 205 468 Q210 445 215 415"
          fill="#5b8c3e"
          stroke="#3d6628"
          strokeWidth="2"
        />
        {/* Right toes */}
        <ellipse cx="232" cy="480" rx="12" ry="6" fill="#4a7a32" />

        {/* Neck */}
        <path
          d="M230 290 Q260 250 270 210 Q275 190 265 185 Q240 200 225 230 Q215 260 220 295"
          fill="#5b8c3e"
          stroke="#3d6628"
          strokeWidth="2"
        />
        <path
          d="M232 288 Q258 252 268 215 Q270 200 262 196 Q244 208 230 235 Q222 260 225 290"
          fill="#6a9e48"
        />

        {/* Head */}
        <ellipse cx="290" cy="170" rx="75" ry="55" fill="#5b8c3e" stroke="#3d6628" strokeWidth="2" />
        <ellipse cx="290" cy="167" rx="68" ry="48" fill="#6a9e48" />

        {/* Snout / jaw */}
        <path
          d="M330 155 Q370 160 385 175 Q390 185 375 192 Q350 198 325 190"
          fill="#5b8c3e"
          stroke="#3d6628"
          strokeWidth="2"
        />
        <path
          d="M332 160 Q365 164 380 176 Q383 183 372 188 Q350 193 328 187"
          fill="#6a9e48"
        />

        {/* Jaw bottom (mouth area) */}
        <path
          d="M310 185 Q340 195 365 192 Q375 200 360 207 Q335 212 310 200 Z"
          fill={mood === "speaking" ? "#c0392b" : "#5b8c3e"}
          stroke="#3d6628"
          strokeWidth="1.5"
        />
        {/* Teeth */}
        {mood === "speaking" && (
          <>
            <polygon points="320,187 325,197 330,187" fill="white" />
            <polygon points="335,189 340,199 345,189" fill="white" />
            <polygon points="350,190 354,199 358,190" fill="white" />
          </>
        )}

        {/* Goofy grin line (when not speaking) */}
        {mood !== "speaking" && (
          <path
            d="M315 190 Q340 202 365 195"
            fill="none"
            stroke="#3d6628"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        )}

        {/* Nostril */}
        <ellipse cx="375" cy="168" rx="4" ry="3" fill="#3d6628" />

        {/* Eyes */}
        {/* Left eye (white) */}
        <ellipse cx="275" cy="150" rx="18" ry="20" fill="white" stroke="#3d6628" strokeWidth="1.5" />
        {/* Left pupil */}
        <ellipse
          cx={mood === "thinking" ? "272" : "278"}
          cy={mood === "thinking" ? "146" : "150"}
          rx="9"
          ry="10"
          fill="#2c1810"
        />
        {/* Left eye shine */}
        <ellipse cx="280" cy="145" rx="4" ry="4" fill="white" opacity="0.8" />

        {/* Right eye (white) */}
        <ellipse cx="315" cy="148" rx="16" ry="18" fill="white" stroke="#3d6628" strokeWidth="1.5" />
        {/* Right pupil */}
        <ellipse
          cx={mood === "thinking" ? "312" : "318"}
          cy={mood === "thinking" ? "144" : "148"}
          rx="8"
          ry="9"
          fill="#2c1810"
        />
        {/* Right eye shine */}
        <ellipse cx="319" cy="143" rx="3.5" ry="3.5" fill="white" opacity="0.8" />

        {/* Eyebrow ridges */}
        <path d="M255 132 Q275 124 295 130" fill="none" stroke="#3d6628" strokeWidth="3" strokeLinecap="round" />
        <path d="M300 128 Q318 122 335 130" fill="none" stroke="#3d6628" strokeWidth="3" strokeLinecap="round" />

        {/* Tiny arms! */}
        <g className={mood === "thinking" ? "" : ""}>
          {/* Left arm */}
          <path
            d="M195 310 Q180 320 172 330 Q168 338 175 340 L182 336"
            fill="#5b8c3e"
            stroke="#3d6628"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Tiny hand */}
          <circle cx="178" cy="338" r="5" fill="#6a9e48" stroke="#3d6628" strokeWidth="1" />

          {/* Right arm */}
          <path
            d="M250 305 Q268 310 278 318 Q284 324 278 328 L272 325"
            fill="#5b8c3e"
            stroke="#3d6628"
            strokeWidth="2"
            strokeLinecap="round"
          />
          {/* Tiny hand */}
          <circle cx="276" cy="326" r="5" fill="#6a9e48" stroke="#3d6628" strokeWidth="1" />
        </g>

        {/* Back spines / bumps */}
        <circle cx="230" cy="272" r="6" fill="#4a7a32" />
        <circle cx="245" cy="262" r="5" fill="#4a7a32" />
        <circle cx="258" cy="248" r="4.5" fill="#4a7a32" />
        <circle cx="268" cy="232" r="4" fill="#4a7a32" />

        {/* Thinking dots */}
        {mood === "thinking" && (
          <>
            <circle cx="360" cy="130" r="5" fill="#f5e6c8" opacity="0.8" className="dot-1" />
            <circle cx="375" cy="115" r="7" fill="#f5e6c8" opacity="0.8" className="dot-2" />
            <circle cx="385" cy="95" r="9" fill="#f5e6c8" opacity="0.8" className="dot-3" />
          </>
        )}
      </svg>
    </div>
  );
}

// ==================== SLEEPING REX ====================

function SleepingRex({ className }: { className?: string }) {
  return (
    <div className={`relative ${className || ""}`}>
      <div className="animate-rex-bob">
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Simplified sleeping Rex - curled up */}
          {/* Body */}
          <ellipse cx="200" cy="280" rx="130" ry="70" fill="#5b8c3e" stroke="#3d6628" strokeWidth="2" />
          <ellipse cx="200" cy="275" rx="115" ry="55" fill="#6a9e48" />
          <ellipse cx="200" cy="285" rx="80" ry="38" fill="#9ecf7a" />

          {/* Head resting */}
          <ellipse cx="300" cy="240" rx="55" ry="40" fill="#5b8c3e" stroke="#3d6628" strokeWidth="2" />
          <ellipse cx="300" cy="237" rx="48" ry="34" fill="#6a9e48" />

          {/* Closed eyes */}
          <path d="M280 230 Q290 224 300 230" fill="none" stroke="#3d6628" strokeWidth="3" strokeLinecap="round" />
          <path d="M310 228 Q320 222 330 228" fill="none" stroke="#3d6628" strokeWidth="3" strokeLinecap="round" />

          {/* Smile */}
          <path d="M305 250 Q320 258 340 252" fill="none" stroke="#3d6628" strokeWidth="2" strokeLinecap="round" />

          {/* Tiny arm tucked */}
          <path d="M260 265 Q250 275 255 280" fill="#5b8c3e" stroke="#3d6628" strokeWidth="2" strokeLinecap="round" />
          <circle cx="254" cy="280" r="4" fill="#6a9e48" stroke="#3d6628" strokeWidth="1" />

          {/* Tail wrapped around */}
          <path
            d="M70 280 Q40 260 50 240 Q60 225 80 235 Q95 250 90 275"
            fill="#5b8c3e"
            stroke="#3d6628"
            strokeWidth="2"
          />
        </svg>
      </div>
      {/* Zzz */}
      <div className="absolute top-8 right-16">
        <span className="zzz-1 absolute text-3xl font-bold text-[#f5e6c8]" style={{ right: 0 }}>Z</span>
        <span className="zzz-2 absolute text-4xl font-bold text-[#f5e6c8]" style={{ right: -20, top: -15 }}>Z</span>
        <span className="zzz-3 absolute text-5xl font-bold text-[#f5e6c8]" style={{ right: -45, top: -35 }}>Z</span>
      </div>
    </div>
  );
}

// ==================== LANDSCAPE BACKGROUND ====================

function PrehistoricLandscape() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#1a2e1a] via-[#2d4a2d] to-[#3d6628]" />

      {/* Volcanic glow in background */}
      <div className="absolute top-[10%] right-[15%] w-40 h-40 rounded-full bg-[#e8722a] opacity-20 blur-3xl animate-volcano-glow" />
      <div className="absolute top-[5%] right-[20%] w-24 h-24 rounded-full bg-[#ff6b35] opacity-15 blur-2xl animate-volcano-glow" style={{ animationDelay: "2s" }} />

      {/* Far mountains */}
      <div className="absolute bottom-[25%] left-0 right-0">
        <svg viewBox="0 0 1600 200" className="w-full" preserveAspectRatio="none">
          <path d="M0 200 L0 120 Q200 40 400 100 Q500 60 650 80 Q800 20 1000 90 Q1200 50 1400 80 Q1500 60 1600 100 L1600 200 Z" fill="#1e3a1e" opacity="0.7" />
        </svg>
      </div>

      {/* Near mountains */}
      <div className="absolute bottom-[18%] left-0 right-0">
        <svg viewBox="0 0 1600 180" className="w-full" preserveAspectRatio="none">
          <path d="M0 180 L0 100 Q150 50 300 90 Q450 30 600 70 Q750 20 900 80 Q1050 40 1200 60 Q1350 30 1600 90 L1600 180 Z" fill="#243d1c" opacity="0.8" />
        </svg>
      </div>

      {/* Ground */}
      <div className="absolute bottom-0 left-0 right-0 h-[22%] bg-gradient-to-t from-[#2a4a1e] to-[#1e3a1e]" />

      {/* Clouds */}
      <div className="animate-cloud-1 absolute top-[8%]">
        <svg width="160" height="60" viewBox="0 0 160 60">
          <ellipse cx="80" cy="35" rx="60" ry="20" fill="white" opacity="0.08" />
          <ellipse cx="55" cy="30" rx="40" ry="18" fill="white" opacity="0.06" />
          <ellipse cx="110" cy="32" rx="35" ry="15" fill="white" opacity="0.06" />
        </svg>
      </div>
      <div className="animate-cloud-2 absolute top-[15%]" style={{ animationDelay: "-20s" }}>
        <svg width="200" height="70" viewBox="0 0 200 70">
          <ellipse cx="100" cy="40" rx="70" ry="22" fill="white" opacity="0.06" />
          <ellipse cx="70" cy="35" rx="45" ry="18" fill="white" opacity="0.05" />
          <ellipse cx="140" cy="38" rx="40" ry="16" fill="white" opacity="0.05" />
        </svg>
      </div>

      {/* Simple ferns/plants */}
      <div className="absolute bottom-[18%] left-[5%] animate-plant-sway origin-bottom">
        <svg width="60" height="80" viewBox="0 0 60 80">
          <path d="M30 80 Q25 50 15 30 Q10 20 20 25 Q28 35 30 50" fill="#3d6628" />
          <path d="M30 80 Q35 50 45 30 Q50 20 40 25 Q32 35 30 50" fill="#4a7a32" />
          <path d="M30 80 Q28 60 20 45 Q15 38 22 40 Q28 48 30 60" fill="#5b8c3e" />
        </svg>
      </div>
      <div className="absolute bottom-[18%] right-[8%] animate-plant-sway origin-bottom" style={{ animationDelay: "-2s" }}>
        <svg width="50" height="70" viewBox="0 0 50 70">
          <path d="M25 70 Q20 45 12 25 Q8 15 18 20 Q24 30 25 45" fill="#3d6628" />
          <path d="M25 70 Q30 45 38 25 Q42 15 32 20 Q26 30 25 45" fill="#4a7a32" />
        </svg>
      </div>
    </div>
  );
}

// ==================== MAIN APP ====================

export default function KioskApp() {
  const [mode, setMode] = useState<AppMode>("attract");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [rexMood, setRexMood] = useState<RexMood>("idle");
  const [factIndex, setFactIndex] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_TIME);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [transitioning, setTransitioning] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const rexMoodTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track which quick question buttons have been used this session.
  // If clicked again, we let the API generate a fresh answer.
  const askedQuickQuestionsRef = useRef<Set<string>>(new Set());

  // Voice (REST-based fallback)
  const {
    voiceSupported,
    voiceState,
    micError,
    startListening,
    stopAndSubmit,
    cancelListening,
    speak,
    cancelSpeech,
  } = useVoice();

  // Live voice (real-time WebSocket)
  const liveVoice = useLiveVoice();
  const isLiveConnected = liveVoice.state !== "disconnected" && liveVoice.state !== "connecting";

  // ---- Fact ticker rotation ----
  useEffect(() => {
    if (mode !== "attract") return;
    const interval = setInterval(() => {
      setFactIndex((prev) => (prev + 1) % FUN_FACTS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [mode]);

  // ---- Auto-scroll chat ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ---- Sync Rex mood with live voice state ----
  useEffect(() => {
    if (liveVoice.state === "speaking") {
      setRexMood("speaking");
    } else if (liveVoice.state === "idle" || liveVoice.state === "listening") {
      setRexMood("idle");
    }
  }, [liveVoice.state]);

  // ---- Reset to attract mode ----
  const resetToAttract = useCallback(() => {
    cancelSpeech();
    liveVoice.disconnect();
    if (rexMoodTimeoutRef.current) clearTimeout(rexMoodTimeoutRef.current);
    askedQuickQuestionsRef.current.clear();
    setTransitioning(true);
    setTimeout(() => {
      setMode("attract");
      setMessages([]);
      setInputValue("");
      setIsLoading(false);
      setRexMood("idle");
      setShowWarning(false);
      setCountdown(WARNING_TIME);
      setConsecutiveErrors(0);
      setTransitioning(false);
    }, 300);
  }, [cancelSpeech, liveVoice]);

  // ---- Inactivity timer ----
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    setShowWarning(false);
    setCountdown(WARNING_TIME);

    const timeout = mode === "voice" ? INACTIVITY_TIMEOUT_VOICE : INACTIVITY_TIMEOUT_TEXT;

    inactivityTimer.current = setTimeout(() => {
      // Start warning countdown
      setShowWarning(true);
      setCountdown(WARNING_TIME);
      let remaining = WARNING_TIME;
      countdownTimer.current = setInterval(() => {
        remaining--;
        setCountdown(remaining);
        if (remaining <= 0) {
          if (countdownTimer.current) clearInterval(countdownTimer.current);
          resetToAttract();
        }
      }, 1000);
    }, (timeout - WARNING_TIME) * 1000);
  }, [resetToAttract, mode]);

  // ---- Cleanup timers on unmount ----
  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    };
  }, []);

  // ---- Start inactivity timer when entering voice or text mode ----
  useEffect(() => {
    if (mode === "voice" || mode === "text") {
      resetInactivityTimer();
    } else {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
    }
  }, [mode, resetInactivityTimer]);

  // ---- Dismiss warning on any touch ----
  const handleWarningDismiss = useCallback(() => {
    if (showWarning) {
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      setShowWarning(false);
      setCountdown(WARNING_TIME);
      resetInactivityTimer();
    }
  }, [showWarning, resetInactivityTimer]);

  // ---- Enter voice mode ----
  const enterVoiceMode = useCallback(() => {
    if (transitioning) return;
    cancelSpeech();
    setMessages([]);
    setTransitioning(true);
    setTimeout(() => {
      setMode("voice");
      setTransitioning(false);
      liveVoice.connect();
    }, 300);
  }, [transitioning, cancelSpeech, liveVoice]);

  // ---- Enter text mode ----
  const enterTextMode = useCallback(() => {
    if (transitioning) return;
    liveVoice.disconnect();
    setMessages([]);
    setTransitioning(true);
    setTimeout(() => {
      setMode("text");
      setTransitioning(false);
    }, 300);
  }, [transitioning, liveVoice]);

  // ---- Switch between modes mid-session ----
  const switchToVoice = useCallback(() => {
    if (transitioning) return;
    cancelSpeech();
    setMessages([]);
    setInputValue("");
    setIsLoading(false);
    setConsecutiveErrors(0);
    setTransitioning(true);
    setTimeout(() => {
      setMode("voice");
      setTransitioning(false);
      liveVoice.connect();
    }, 300);
  }, [transitioning, cancelSpeech, liveVoice]);

  const switchToText = useCallback(() => {
    if (transitioning) return;
    liveVoice.disconnect();
    setMessages([]);
    setRexMood("idle");
    setTransitioning(true);
    setTimeout(() => {
      setMode("text");
      setTransitioning(false);
    }, 300);
  }, [transitioning, liveVoice]);

  // ---- Helper: set Rex mood to speaking, then idle after TTS completes ----
  /** Set Rex mood to speaking, call TTS API, then idle when done. */
  const speakAsRex = useCallback(
    async (text: string) => {
      if (rexMoodTimeoutRef.current) clearTimeout(rexMoodTimeoutRef.current);
      setRexMood("speaking");
      await speak(text);
      setRexMood("idle");
    },
    [speak]
  );

  // ---- Send message to API ----
  const sendMessage = useCallback(
    async (text: string): Promise<string | null> => {
      if (isLoading || !text.trim()) return null;

      const userMessage: ChatMessage = { role: "user", content: text.trim() };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInputValue("");
      setIsLoading(true);
      setRexMood("thinking");
      resetInactivityTimer();

      // Send last 6 messages for context
      const contextMessages = updatedMessages.slice(-6);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: contextMessages }),
        });

        if (!res.ok) {
          const errorBody = await res.json().catch(() => null);
          const message = errorBody?.error || "API error";
          throw new Error(message);
        }

        const data = await res.json();
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.response,
        };

        // Show text bubble immediately — don't wait for audio
        setMessages((prev) => [...prev, assistantMessage]);
        setConsecutiveErrors(0);
        setIsLoading(false);

        // Fire TTS in background — voice follows text
        speakAsRex(data.response);
        resetInactivityTimer();
        return data.response;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        setConsecutiveErrors((prev) => {
          const next = prev + 1;
          if (next >= 3) {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: "Rex is taking a nap right now. Come back soon!",
              },
            ]);
          } else {
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Ugh, my tiny brain is having a moment (${errorMessage})... try asking me again!`,
              },
            ]);
          }
          return next;
        });
        setRexMood("idle");
        setIsLoading(false);
        resetInactivityTimer();
        return null;
      }
    },
    [isLoading, messages, resetInactivityTimer, speakAsRex]
  );

  // ---- Send quick canned response (no API call) ----
  const sendQuickReply = useCallback(
    (questionId: string, questionLabel: string) => {
      const alreadyAsked = askedQuickQuestionsRef.current.has(questionId);

      if (alreadyAsked) {
        // Second+ time we see this question in the same session: call the API.
        sendMessage(questionLabel);
        return;
      }

      // First time: reply locally to save tokens.
      askedQuickQuestionsRef.current.add(questionId);
      const answer = QUICK_QUESTION_ANSWERS[questionId] || "[Answer not set yet]";
      const userMessage: ChatMessage = { role: "user", content: questionLabel };
      const assistantMessage: ChatMessage = { role: "assistant", content: answer };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setRexMood("thinking");
      setConsecutiveErrors(0);
      resetInactivityTimer();

      // Fake a short thinking delay so it feels like a real API call.
      setTimeout(async () => {
        setMessages((prev) => [...prev, assistantMessage]);
        setIsLoading(false);
        await speakAsRex(answer);
        resetInactivityTimer();
      }, 800);
    },
    [resetInactivityTimer, sendMessage, speakAsRex]
  );

  // ---- Handle form submit ----
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
  };

  // ---- Handle voice mic toggle ----
  const handleMicToggle = useCallback(() => {
    if (voiceState === "speaking") {
      cancelSpeech();
      setRexMood("idle");
      return;
    }
    if (voiceState === "listening") {
      cancelListening();
      return;
    }
    if (isLoading || consecutiveErrors >= 3) return;
    startListening();
  }, [voiceState, isLoading, consecutiveErrors, startListening, cancelListening, cancelSpeech]);

  // ---- Submit voice transcript ----
  const handleVoiceSubmit = useCallback(async () => {
    const text = await stopAndSubmit();
    if (text) {
      sendMessage(text);
    }
  }, [stopAndSubmit, sendMessage]);

  // ==================== ATTRACT MODE ====================

  if (mode === "attract") {
    return (
      <div
        className={`fixed inset-0 ${transitioning ? "animate-fade-out" : "animate-fade-in"}`}
      >
        <PrehistoricLandscape />

        <div className="relative z-10 flex flex-col items-center justify-center h-full px-8">
          {/* Rex character */}
          <div className="w-[320px] h-[380px] mb-2 flex-shrink-0">
            <RexCharacter mood="idle" />
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white text-center animate-pulse-glow tracking-tight leading-tight mb-6 flex-shrink-0">
            ASK A DINOSAUR!
          </h1>

          {/* Two big mode buttons */}
          <div className="flex gap-8 flex-shrink-0">
            {/* Talk to Rex button */}
            <button
              onClick={enterVoiceMode}
              disabled={!voiceSupported}
              className="w-[340px] h-[160px] rounded-3xl bg-[#2a9d8f] text-white flex flex-col items-center justify-center gap-3 active:bg-[#228076] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xl hover:scale-[1.02] active:scale-95"
            >
              {/* Mic icon */}
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="23" />
                <line x1="8" y1="23" x2="16" y2="23" />
              </svg>
              <span className="text-3xl font-extrabold tracking-wide">TALK TO REX</span>
              <span className="text-lg opacity-80">Use your voice!</span>
            </button>

            {/* Type to Rex button */}
            <button
              onClick={enterTextMode}
              className="w-[340px] h-[160px] rounded-3xl bg-[#e8722a] text-white flex flex-col items-center justify-center gap-3 active:bg-[#c55f22] transition-all shadow-2xl hover:scale-[1.02] active:scale-95"
            >
              {/* Keyboard icon */}
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
                <line x1="6" y1="8" x2="6" y2="8" />
                <line x1="10" y1="8" x2="10" y2="8" />
                <line x1="14" y1="8" x2="14" y2="8" />
                <line x1="18" y1="8" x2="18" y2="8" />
                <line x1="6" y1="12" x2="6" y2="12" />
                <line x1="10" y1="12" x2="10" y2="12" />
                <line x1="14" y1="12" x2="14" y2="12" />
                <line x1="18" y1="12" x2="18" y2="12" />
                <line x1="7" y1="16" x2="17" y2="16" />
              </svg>
              <span className="text-3xl font-extrabold tracking-wide">TYPE TO REX</span>
              <span className="text-lg opacity-80">Type your questions!</span>
            </button>
          </div>

        </div>
      </div>
    );
  }

  // ==================== VOICE MODE ====================

  if (mode === "voice") {
    return (
      <div
        className={`fixed inset-0 flex flex-col ${transitioning ? "animate-fade-out" : "animate-fade-in"}`}
        onTouchStart={handleWarningDismiss}
        onClick={handleWarningDismiss}
      >
        <PrehistoricLandscape />

        {/* Main content: large centered Rex */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          {/* Rex character — large */}
          <div className="w-[500px] h-[600px]">
            <RexCharacter mood={rexMood} />
          </div>

          {/* Visual feedback below Rex */}
          <div className="mt-4 flex flex-col items-center gap-3 min-h-[80px]">
            {liveVoice.state === "connecting" && (
              <div className="flex items-center gap-3 animate-fade-in">
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                <p className="text-2xl text-[#f5e6c8] font-semibold">Waking up Rex...</p>
              </div>
            )}

            {liveVoice.state === "idle" && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <div className="voice-ring-pulse w-20 h-20 rounded-full border-4 border-green-400" />
                <p className="text-2xl text-[#f5e6c8] font-semibold">Just talk to Rex!</p>
              </div>
            )}

            {liveVoice.state === "listening" && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <div className="voice-ring-pulse w-20 h-20 rounded-full border-4 border-green-400" />
                <p className="text-2xl text-green-300 font-semibold">Listening...</p>
              </div>
            )}

            {liveVoice.state === "speaking" && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <div className="flex items-end gap-[4px] h-10">
                  {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
                    <div
                      key={i}
                      className="w-[5px] bg-[#e8722a] rounded-full sound-bar"
                      style={{ height: "100%", animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
                <p className="text-2xl text-[#e8722a] font-semibold">Rex is talking...</p>
              </div>
            )}

            {liveVoice.state === "disconnected" && liveVoice.error && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <p className="text-xl text-red-400 font-medium">{liveVoice.error}</p>
                <button
                  onClick={switchToText}
                  className="px-8 py-4 rounded-xl bg-[#e8722a] text-white text-xl font-bold active:bg-[#c55f22] transition-colors shadow-lg"
                >
                  TRY TYPING INSTEAD
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="relative z-10 flex-shrink-0 p-6 flex gap-4 justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetToAttract();
            }}
            className="h-[64px] px-10 rounded-xl bg-black/40 text-[#f5f0e8] text-xl font-bold backdrop-blur-sm active:bg-black/60 transition-colors"
          >
            START OVER
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              switchToText();
            }}
            className="h-[64px] px-10 rounded-xl bg-[#e8722a] text-white text-xl font-bold active:bg-[#c55f22] transition-colors shadow-lg"
          >
            SWITCH TO TYPING
          </button>
        </div>

        {/* Inactivity warning overlay */}
        {showWarning && (
          <div
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 animate-fade-in"
            onClick={(e) => { e.stopPropagation(); handleWarningDismiss(); }}
            onTouchStart={(e) => { e.stopPropagation(); handleWarningDismiss(); }}
          >
            <div className="w-64 h-64 mb-6"><SleepingRex /></div>
            <p className="text-3xl text-[#f5e6c8] font-bold mb-4 text-center">Rex is getting sleepy...</p>
            <p className="text-xl text-[#f5e6c8] opacity-80 mb-8">Touch anywhere to keep talking!</p>
            <div className="text-8xl font-extrabold text-[#e8722a] animate-countdown-pulse">{countdown}</div>
          </div>
        )}
      </div>
    );
  }

  // ==================== TEXT MODE ====================

  return (
    <div
      className={`fixed inset-0 flex flex-col ${transitioning ? "animate-fade-out" : "animate-fade-in"}`}
      onTouchStart={handleWarningDismiss}
      onClick={handleWarningDismiss}
    >
      <PrehistoricLandscape />

      {/* Start Over button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          resetToAttract();
        }}
        className="absolute top-4 right-4 z-30 px-4 py-3 min-h-[48px] rounded-xl bg-black/30 text-[#f5f0e8] text-sm font-semibold backdrop-blur-sm active:bg-black/50 transition-colors"
      >
        Start Over
      </button>

      {/* Main content: Rex + buttons on left, chat on right */}
      <div className="relative z-10 flex w-full h-full p-4 gap-4">
        {/* Left column: Rex character + quick question buttons */}
        <div className="flex-shrink-0 w-[320px] flex flex-col overflow-hidden">
          {/* Rex */}
          <div className="flex-shrink-0 flex flex-col items-center">
            <div className="w-[240px] h-[280px]">
              <RexCharacter mood={rexMood} />
            </div>
            {isLoading && (
              <div className="flex gap-2 mt-1">
                <div className="w-3 h-3 rounded-full bg-[#f5e6c8] dot-1" />
                <div className="w-3 h-3 rounded-full bg-[#f5e6c8] dot-2" />
                <div className="w-3 h-3 rounded-full bg-[#f5e6c8] dot-3" />
              </div>
            )}
          </div>

          {/* Quick question buttons */}
          <div className="flex-1 overflow-y-auto chat-scroll mt-3 space-y-2 pr-1 pb-2">
            {QUICK_QUESTIONS.map((q, i) => (
              <button
                key={q.id}
                onClick={() => sendQuickReply(q.id, q.label)}
                disabled={isLoading || consecutiveErrors >= 3}
                className={`w-full min-h-[52px] px-4 py-3 rounded-xl text-white font-semibold text-base text-left leading-snug shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_COLORS[i]}`}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right column: chat + text input */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat history */}
          <div className="flex-1 overflow-y-auto chat-scroll pr-2 pt-12 pb-4">
            {messages.length === 0 && !isLoading && (
              <div className="flex items-center justify-center h-full">
                <p className="text-2xl text-[#f5e6c8] opacity-60 text-center">
                  Ask Rex a question!
                  <br />
                  <span className="text-lg">Tap a button or type your own.</span>
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`mb-3 flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-bubble-pop`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-5 py-4 shadow-lg ${
                    msg.role === "assistant"
                      ? "bg-[#f5e6c8] text-[#3d2b1f]"
                      : "bg-[#a8c5a0] text-[#1a2e1a]"
                  }`}
                  style={{ fontSize: msg.role === "assistant" ? "22px" : "20px" }}
                >
                  {msg.role === "assistant" && (
                    <span className="font-bold text-[#5b8c3e] mr-1">Rex:</span>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 pb-2">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Type your question..."
                disabled={isLoading || consecutiveErrors >= 3}
                className="flex-1 h-[56px] px-5 rounded-xl bg-white/90 text-[#3d2b1f] text-xl placeholder:text-[#8a7a6a] outline-none focus:ring-2 focus:ring-[#e8722a] disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim() || consecutiveErrors >= 3}
                className="h-[56px] px-8 rounded-xl bg-[#e8722a] text-white text-xl font-bold active:bg-[#c55f22] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
              >
                ASK REX!
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ---- Inactivity warning overlay ---- */}
      {showWarning && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/70 animate-fade-in"
          onClick={(e) => { e.stopPropagation(); handleWarningDismiss(); }}
          onTouchStart={(e) => { e.stopPropagation(); handleWarningDismiss(); }}
        >
          <div className="w-64 h-64 mb-6"><SleepingRex /></div>
          <p className="text-3xl text-[#f5e6c8] font-bold mb-4 text-center">Rex is getting sleepy...</p>
          <p className="text-xl text-[#f5e6c8] opacity-80 mb-8">Touch anywhere to keep talking!</p>
          <div className="text-8xl font-extrabold text-[#e8722a] animate-countdown-pulse">{countdown}</div>
        </div>
      )}

      {/* ---- Full offline fallback overlay ---- */}
      {consecutiveErrors >= 3 && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1a2e1a] animate-fade-in">
          <div className="w-72 h-72 mb-6"><SleepingRex /></div>
          <p className="text-4xl text-[#f5e6c8] font-bold mb-4 text-center">Rex is taking a nap right now.</p>
          <p className="text-2xl text-[#f5e6c8] opacity-70 mb-10">Come back soon!</p>
          <button
            onClick={() => { setConsecutiveErrors(0); setMessages([]); resetToAttract(); }}
            className="px-10 py-5 rounded-xl bg-[#e8722a] text-white text-2xl font-bold active:bg-[#c55f22] transition-colors shadow-lg"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
