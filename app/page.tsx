"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useVoice } from "./hooks/useVoice";

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
      <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-2xl">
        {/* Claws / toes (front) */}
        <path fill="#E8DD9E" d="M5.48,31.52l8.45,1.27l7.27,5.23c0,0-1.71,2.75-3.78,2.09c-2.18-0.69-1.83-3.59-1.83-3.59 s-1.48,2.37-2.98,1.71c-1.9-0.83-1.78-3.47-1.78-3.47s-1.42,1.8-3.1,1.22C5.01,35.04,5.48,31.52,5.48,31.52z" />

        {/* Mouth / jaw area */}
        <path fill={mood === "speaking" ? "#CC3310" : "#FF631A"} d="M34.57,31l-22.24-4.88l-5.82,0.75c0,0-2.16,3.47-1.97,4.13c0.19,0.66,0.56,1.31,1.78,1.69 c1.22,0.38,5.91,1.31,7.7,2.25c1.78,0.94,7.13,4.97,7.13,4.97s-1.64,2.77-3.97,4.97c-1.11,1.05-7.11,5.07-7.11,5.07l8.92,1.88 l15.86-9.48L34.57,31z" />

        {/* Left foot */}
        <path fill="#596514" d="M43.49,56.91c0,0-5.26-1.69-7.41,2.82c-2.16,4.5,0.39,6.01-1.78,8.35c-1.22,1.31-2.44-0.47-5.16,1.31 c-2.04,1.33-3.1,4.41-2.72,7.04c0.38,2.63,1.88,6.01,3.57,5.73c1.69-0.28,1.13-3.94,1.13-3.94s1.29,3.47,2.91,3.47 c2.35,0,1.03-5.35,1.69-5.73c0.66-0.38,4.06,0.58,6.38-0.66c2.82-1.5,5.26-10.89,5.26-10.89L43.49,56.91z" />

        {/* Left leg + body */}
        <path fill="#596514" d="M60.29,53.25c0,0-16.87,18.75-17.27,27.59c-0.34,7.6,3.38,12.01,7.23,14.27 c3.85,2.25,8.54,3.47,8.54,8.07s-5.35,5.63-7.6,5.82c-2.25,0.19-5.54,0.73-8.28,2.18c-2.76,1.46-4.2,5.18-2.7,6.08 c0.94,0.56,4.79-1.67,4.79-1.67s-1.33,3.33,0.38,3.64c2.86,0.52,7.79-2.53,7.79-2.53s-1.71,2.25-0.49,2.77 c1.94,0.82,4.53-0.7,5.65-1.36c1.13-0.66,4.04-2.91,5.82-3c1.78-0.09,5.35,0.47,5.44-0.38c0.09-0.84-2.82-4.08-2.91-7.09 c-0.09-3,2.06-6.24,2.06-9.15c0-2.91-6.48-4.79-6.1-9.85c0.14-1.95,12.12-17.04,11.92-23.56C74.23,54.65,60.29,53.25,60.29,53.25z" />

        {/* Tiny arm */}
        <path fill="#596514" d="M102.8,50.71c0,0,8.07-3.19,7.7-5.91s-7.32-4.13-9.2-4.32c-1.88-0.19-5.35-1.03-7.13-2.82 c-1.78-1.78-2.44-4.13-1.41-4.6c1.03-0.47,5.35,1.6,5.35,1.6s11.36,0.47,12.95,0.75s12.11,5.82,8.35,11.07 C115.66,51.75,102.8,50.71,102.8,50.71z" />

        {/* Upper teeth */}
        <path fill="#FFFFFF" d="M8.03,27.81c0,0,0.99,4.22,3.03,4.36c2.04,0.14,2.53-3.8,2.53-3.8l1.13-0.99c0,0-1.41,5,1.27,6.05 c2.67,1.06,2.18-4.93,2.18-4.93l1.06,0.99c0,0,0.07,6.9,2.53,6.76c2.46-0.14,2.46-5.07,2.46-5.07l-6.97-7.04L8.03,27.81z" />

        {/* Toe details */}
        <path fill="#E3D9A8" d="M48.18,82.67c0,0-0.63,4.22,1.27,4.65s1.69-3.66,1.69-3.66L48.18,82.67z" />
        <path fill="#E3D9A8" d="M53.44,85.39c0,0,0.28,4.08,2.11,3.73c1.83-0.35,0.63-5.07,0.63-5.07L53.44,85.39z" />

        {/* Lower teeth */}
        <path fill="#FFFFFF" d="M27.11,46.33c0,0-0.19-4.76-2.32-4.29c-1.17,0.26-1.9,1.83-2.04,3.94c-0.07,0.98-0.49,3.24-0.49,3.24 h-0.84c0,0-0.35-4.15-2.32-3.73c-1.97,0.42-2.11,5.07-2.11,5.07l5.21,1.06L27.11,46.33z" />

        {/* Lower teeth 2 */}
        <path fill="#E3E0AA" d="M15.33,49.54c0,0-0.14-4.72-2.04-4.43s-1.9,3.24-1.9,3.24S10.26,46.09,9,46.58s-1.03,2.32-0.12,4.15 C9.75,52.49,15.33,49.54,15.33,49.54z" />
        <path fill="#FFFFFF" d="M13.59,50.97c0,0,0.42-4.65-0.49-4.79c-0.92-0.14-0.92,1.27-0.92,1.97c0,0.7,0.14,3.03,0.14,3.03 L13.59,50.97z" />

        {/* Main body */}
        <path fill="#96A820" d="M39.26,24.18c0,0-0.73-3.94-3.68-4.86c-5.44-1.69-8.7,2.98-8.7,2.98s-4.11-0.23-6.66-1.22 s-7.11-3.51-10.49-2.14c-2.77,1.13-4.15,3.82-4.9,6.92s-0.28,5.16-0.28,5.16s3.19-3.1,6.85-2.82c3.66,0.28,9.29,3.19,10.79,3.94 c1.5,0.75,9.95,3.19,9.95,3.19s-1.69,5.35-2.91,6.85c-1.22,1.5-3.85,3.57-7.98,5.35c-4.13,1.78-12.2,3.1-12.2,3.1 s0.56,6.57,2.82,7.6c2.25,1.03,6.29,1.88,9.29,0.56s13.8-2.25,13.8-2.25s1.69,0.75,3.1,2.35s3.28,3.57,4.13,5.91 c0.84,2.35,1.69,4.97,2.44,6.48c0.75,1.5,2.53,5.16,2.53,5.16s1.41-2.82,3.38-3.47c1.97-0.66,4.6-0.19,4.6-0.19 s-0.31-10.4,1.97-14.08c2.25-3.64,4.97-4.41,8.07-4.22c3.1,0.19,3.66,2.16,1.22,2.16s-6.08,0.87-7.39,3.78s-1.53,4.86-1.9,7.58 c-0.38,2.72-0.38,6.1-0.38,6.1s-3.47-0.47-5.54,0.38c-2.06,0.84-3.38,3.57-3.57,5.44c-0.19,1.88,0.38,4.41,2.06,4.5 c1.69,0.09,2.16-1.78,2.16-1.78s0.28,3.75,3.28,3.28c3-0.47,2.11-2.75,3.61-4.53s4.58-2.11,7.86-6.52c3.28-4.41,3.21-6.9,3.21-7.65 s-0.16-2.86,0.87-2.96c1.03-0.09,1.15,2.04,1.15,2.98s-0.84,5.8-3.75,9.1c-2.32,2.64-6.38,4.69-7.6,6.48s-1.15,4.06-1.13,4.13 c0.21,0.64,3.47,1.78,6.95,2.06c3.47,0.28,6.57-1.22,6.57-1.22s0,3.94,0.38,7.04c0.38,3.1,2.63,5.91,2.25,9.39 c-0.38,3.47-2.25,6.29-3.57,7.04c-1.31,0.75-7.22,3.04-6.59,5.4c0.45,1.69,3.69,1.34,5.19,1.08c1.62-0.28,2.53-0.49,4.04-0.31 c1.5,0.19,0.56,4.41,3.47,4.22c2.91-0.19,5.35-4.18,7.04-4.11c2.3,0.09,6.6,3.29,9.06,1.22c1.95-1.64-1.74-4.5-3.99-6.76 s-4.5-5.54-4.32-11.26c0,0,0.38-9.01,0.47-11.64c0.09-2.63,0.09-7.32,0.09-7.32s4.41-3.28,6.48-5.54c2.06-2.25,2.35-3.85,5.91-6.95 c3.57-3.1,12.29-2.56,21.3-10.79c4.45-4.07,6.1-13.7,0.19-20.46c-5.91-6.76-17.08-4.04-19.43-4.32c-2.35-0.28-5.91-2.25-7.46-1.43 c-1.23,0.65-1.13,1.69-1.13,1.69s4.38,2.32,7.46,2.84c6.03,1.01,16.61-1.5,16.8,5.91s-19.71,7.98-21.59,7.79 c-1.88-0.19-12.37-6.24-16.21-7.23c-3.41-0.87-8.35-1.73-11.94-1.5c-3.75,0.23-6.5,0.94-9.2,2.16c-1.31,0.59-2.18,1.29-2.18,1.29 s-6.54-13.76-10.39-17.62C41.98,24.65,39.26,24.18,39.26,24.18z" />

        {/* Body shadow details */}
        <path fill="#5A6610" d="M33.44,34.15c-0.56-0.77-5.98-0.21-8.8-1.76c-2.82-1.55-9.92-5.77-14.01-5.49 c-4.08,0.28-6.08,3.21-6.1,4.11c-0.02,0.89,0.68,0.89,1.53-0.02s2.67-2.6,6.41-1.97c3.73,0.63,10.91,5.14,13.73,6.26 c2.82,1.13,5.14,0.42,5.14,0.42s-0.07,1.64-1.06,3.4c-0.99,1.76-4.01,5.77-2.42,4.69c1.83-1.24,4.01-4.17,4.55-5.42 C33.12,36.75,33.44,34.15,33.44,34.15z" />

        {/* Eye */}
        <ellipse
          transform="matrix(0.8308 -0.5565 0.5565 0.8308 -8.313 22.4355)"
          fill="#31312F"
          cx={mood === "thinking" ? "31.5" : "32.75"}
          cy={mood === "thinking" ? "23.5" : "24.89"}
          rx="2.61"
          ry="2.5"
        />

        {/* Body shading */}
        <path fill="#586214" d="M46.18,38.16c1.21-1.21,3.91,4.67,1.71,11.57c-1.13,3.54-4.46,6.73-10.23,7.93s-7.81,0.21-11.12,0.63 s-7.25,3.24-12.6,1.62s-5.28-6.34-5.56-7.6c-0.28-1.27-0.09-1.76,0.66-1.69s0.92,4.16,1.99,5.65c0.96,1.34,3.73,2.77,6.15,2.51 c3.24-0.35,3.8-1.76,9.43-2.75c5.63-0.99,12.32-0.14,16.4-6.19C47.5,43.19,45.13,39.22,46.18,38.16z" />

        {/* Body stripe details */}
        <path fill="#586415" d="M70.54,48.02c0.4,3.08-0.03,5.7-0.92,7.25c-0.77,1.36-3.07,1.36-3.07,1.36s-0.87-0.87-2.42-1.15 c-1.55-0.28-1.48-1.55-1.55-3.45s-0.97-3.36-1.79-4.86c-0.99-1.79-2.67-3.45-2.67-3.45s1.17-0.79,4.66-1.53 c2.54-0.54,4.81-0.45,4.81-0.45S70.12,44.78,70.54,48.02z" />
        <path fill="#586415" d="M73.14,42.21c0,0,2.86,2.35,3.03,6.79c0.18,4.79-0.87,10.05,2.25,10.98 c3.24,0.96,5.84-1.69,6.26-5.84c0.42-4.15-0.6-8.62-0.6-8.62s-2.96-1.44-5.38-2.22C77.34,42.86,73.14,42.21,73.14,42.21z" />
        <path fill="#586415" d="M92.64,59.32c2.71,0.81,4.15-1.24,4.79-4.55s0.68-4.27,0.68-4.27s-2.04,0.14-3.28-0.05 c-0.76-0.12-4.18-1.67-4.18-1.67s0.02,3.09,0.02,4.15C90.67,55.62,90.06,58.55,92.64,59.32z" />

        {/* Tail spots */}
        <path fill="#596514" d="M80.11,79.13c-0.86,1.45-1.93,2.31-2.8,1.96c-0.87-0.34-1.1-1.82-0.65-3.44 c0.57-2.09,2.03-2.58,2.9-2.24C80.43,75.75,81.13,77.41,80.11,79.13z" />
        <ellipse transform="matrix(0.1171 -0.9931 0.9931 0.1171 -21.5582 166.1349)" fill="#596514" cx="82.66" cy="95.19" rx="1.73" ry="1.11" />
        <ellipse fill="#596514" cx="82.33" cy="88.28" rx="1.3" ry="1.9" />

        {/* Speaking mouth open effect — red glow inside mouth */}
        {mood === "speaking" && (
          <ellipse cx="18" cy="38" rx="8" ry="4" fill="#CC3310" opacity="0.5" />
        )}

        {/* Thinking dots */}
        {mood === "thinking" && (
          <>
            <circle cx="26" cy="14" r="2" fill="#f5e6c8" opacity="0.8" className="dot-1" />
            <circle cx="22" cy="9" r="2.8" fill="#f5e6c8" opacity="0.8" className="dot-2" />
            <circle cx="17" cy="4" r="3.5" fill="#f5e6c8" opacity="0.8" className="dot-3" />
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

      {/* Background dinosaurs chilling at the bottom */}
      {/* Triceratops — left side */}
      <div className="absolute bottom-[2%] left-[3%] animate-rex-bob" style={{ animationDelay: "-1s" }}>
        <svg width="200" height="140" viewBox="0 0 363 363">
          <path fill="#DA88B4" d="M292.363,194.159c-7.765-13.09-6.008-22.393-30.748-52.543c-4.483-5.464-13.089-11.398-23.651-16.693c0.78-0.917,1.597-1.862,2.498-2.871c3.732-4.179-2.063-3.435-10.653-0.918c-1.694-0.73-3.416-1.441-5.166-2.127c1.568-2.037,3.476-4.331,5.819-6.955c4.987-5.585-7.033-2.38-20.011,2.102c-0.206-0.06-0.413-0.118-0.62-0.177c1.818-2.585,4.286-5.661,7.616-9.39c5.695-6.377-10.782-1.295-25.541,4.063c1.516-1.949,3.333-4.125,5.541-6.598c7.511-8.412-23.553,3.114-38.366,8.912c2.45-2.724,4.957-6.059,4.957-8.315c0,0,1.559-4.663-2.074-1.551c0,0-10.106,10.888-27.739,12.7c0,0-18.922,2.074-25.919,9.334c0,0-1.559-1.556-2.594-2.077c0,0,21.543-31.232,55.242-30.711c0,0,14.774-1.556,1.036-4.666c0,0-31.651-13.878-67.422,20.085c0,0-7.519,7.772-12.962,7.511c0,0-18.044,1.043-31.113,10.632c-5.736,4.208-3.492,25.927-7.381,27.483c0,0-6.225,2.589-1.818,9.07c0,0-11.042,15.549-15.19,8.547c0,0-20.222-30.587-20.999-26.954c0,0,3.889,31.625,8.296,38.88c0,0-13.402,3.057-13.402,21.177c0,39.054,36.497,21.343,43.239,22.637c0,0,21.77,1.556,28.513-1.815c0,0,8.489-14.966,9.863-14.073c61.956,40.28,165.275,40.612,168.385,40.095c0,0,15.852-21.036,20-20c0,0,50.153,40.065,93.23-14.999C363.23,213.957,311.615,226.615,292.363,194.159z" />
          <path fill="#D570A7" d="M292.363,194.159c-7.765-13.09-6.008-22.393-30.748-52.543c-4.483-5.464-13.089-11.398-23.651-16.693c0.78-0.917,1.597-1.862,2.498-2.871c3.732-4.179-2.063-3.435-10.653-0.918c-1.694-0.73-3.416-1.441-5.166-2.127c1.568-2.037,3.476-4.331,5.819-6.955c4.987-5.585-7.033-2.38-20.011,2.102c-0.206-0.06-0.413-0.118-0.62-0.177c1.818-2.585,4.286-5.661,7.616-9.39c5.695-6.377-10.782-1.295-25.541,4.063c1.516-1.949,3.333-4.125,5.541-6.598c4.445-4.978-4.62-2.973-15.832,0.695v140.483c36.901,6.035,66.736,6.001,68.385,5.726c0,0,15.852-21.036,20-20c0,0,50.153,40.065,93.23-14.999C363.23,213.957,311.615,226.615,292.363,194.159z" />
          <path fill="#D570A7" d="M210.031,226.213L230,256.166l-3.328,2.219c-5.492,3.661-6.989,11.15-3.328,16.641c3.661,5.492,11.15,6.989,16.641,3.328l3.328-2.219l19.969-13.313l-13.313-19.969L230,212.9L210.031,226.213z" />
          <path fill="#DA88B4" d="M186,218.955v36h-4c-6.6,0-12,5.4-12,12c0,6.6,5.4,12,12,12h4h24v-24v-36H186z" />
          <path fill="#DA88B4" d="M116.749,222.268l19.969,29.954l-3.328,2.219c-5.492,3.661-6.989,11.15-3.328,16.641c3.661,5.492,11.15,6.989,16.641,3.328l3.328-2.219L170,258.878l-13.313-19.969l-19.969-29.954L116.749,222.268z" />
          <path fill="#DA88B4" d="M92.718,215.011v36h-4c-6.6,0-12,5.4-12,12c0,6.6,5.4,12,12,12h4h24v-24v-36H92.718z" />
          <circle fill="#272525" cx="61.615" cy="171.616" r="9.249" />
        </svg>
      </div>

      {/* Stegosaurus — right side */}
      <div className="absolute bottom-[1%] right-[2%] animate-rex-bob" style={{ animationDelay: "-2s" }}>
        <svg width="210" height="145" viewBox="0 0 381 381" style={{ transform: "scaleX(-1)" }}>
          <path fill="#D570A7" d="M142.029,133.088c0-19.618,48.008-63.198,48.008-63.198s48.006,43.58,48.006,63.198C238.043,138.907,142.029,138.894,142.029,133.088z" />
          <path fill="#D05B9C" d="M217.545,127.686c8.665-12.89,59.456-20.319,59.456-20.319s12.293,49.837,3.628,62.727C278.059,173.917,214.981,131.5,217.545,127.686z" />
          <path fill="#D05B9C" d="M260.727,157.165c8.078-8.078,45.793-6.255,45.793-6.255s1.823,37.714-6.256,45.793C297.869,199.098,258.337,159.555,260.727,157.165z" />
          <path fill="#D570A7" d="M117.201,150.769c-8.078-8.078-45.793-6.255-45.793-6.255s-1.823,37.714,6.256,45.793C80.059,192.703,119.591,153.16,117.201,150.769z" />
          <path fill="#D570A7" d="M164.838,126.316c-9.057-12.617-60.054-18.48-60.054-18.48s-10.753,50.192-1.696,62.809C105.775,174.387,167.519,130.05,164.838,126.316z" />
          <path fill="#DA88B4" d="M376.697,166.807c-88.333,48.667-93.667-16.333-150-40c-102.646-43.123-101,61.667-170,60c-47.486-1.147-67.661,36.042-50.844,59.756c9.726,13.714,29.138,14.189,40,10.244c59.667-21.667,80.285,29.344,90.844,20c9.061-8.019,39.833,5.133,54.963,5.133c4.95,0,54.049-10.8,55.037-25.133C305.413,242.201,352.656,207.586,376.697,166.807z" />
          <path fill="#D570A7" d="M233.468,306.589h-4.701c-8.437,0-15.277-6.84-15.277-15.277V243.61h35.255v47.702C248.745,299.749,241.905,306.589,233.468,306.589z" />
          <path fill="#D570A7" d="M273.071,301.328h-4.701c-8.437,0-15.277-6.84-15.277-15.277v-47.702h35.255v47.702C288.349,294.488,281.509,301.328,273.071,301.328z" />
          <path fill="#DA88B4" d="M126.35,306.218l-4.521-1.288c-8.114-2.312-12.818-10.765-10.505-18.879l13.074-45.875l33.905,9.662l-13.074,45.875C142.917,303.827,134.464,308.53,126.35,306.218z" />
          <path fill="#DA88B4" d="M173.579,306.589h-4.701c-8.437,0-15.277-6.84-15.277-15.277V243.61h35.255v47.702C188.856,299.749,182.017,306.589,173.579,306.589z" />
          <circle fill="#272525" cx="34.611" cy="216.807" r="6" />
        </svg>
      </div>

      {/* Diplodocus — center-left */}
      <div className="absolute bottom-[0%] left-[22%] animate-rex-bob" style={{ animationDelay: "-0.5s" }}>
        <svg width="180" height="130" viewBox="0 0 379 379">
          <path fill="#DF936F" d="M160.088,327.699l-3.883-1.624c-6.969-2.916-10.255-10.929-7.34-17.898l16.483-39.402l29.121,12.182l-16.483,39.402C175.071,327.328,167.057,330.615,160.088,327.699z" />
          <path fill="#DB8269" d="M212.078,329.071h-4.209c-7.555,0-13.679-6.124-13.679-13.679v-53.069h31.566v53.069C225.757,322.947,219.632,329.071,212.078,329.071z" />
          <path fill="#DF936F" d="M61.416,327.699l-3.883-1.624c-6.969-2.916-10.255-10.929-7.34-17.898l16.483-39.402l29.121,12.182l-16.483,39.402C76.399,327.328,68.385,330.615,61.416,327.699z" />
          <path fill="#DF936F" d="M113.406,329.071h-4.209c-7.555,0-13.679-6.124-13.679-13.679v-42.71h31.566v42.71C127.085,322.947,120.96,329.071,113.406,329.071z" />
          <path fill="#DF936F" d="M318.463,324.478c-22.43-8-35.93-20.46-55.87-33.35c-10.28-6.65-34.26-25.01-58.08-18.45c-6.34-3.12,12.17,30.76-124.31,10.36c-30.04-4.49-52.982-22.917-61.34-36.38c-18.067-29.102-25.521-62.36-11.74-97.57c14.598-37.3,63.74-88.66,67.39-91.11c6.23-7.87,18.04-13.19,31.59-13.19c20.02,0,36.26,11.59,36.26,25.9c0,14.3-16.24,25.89-36.26,25.89c-4.48,0-8.76-0.58-12.72-1.64c-8.77,3.54-19.1,14.46-25.5,19.77c-20.53,17.05-33.75,45.67-9.67,66.31c19.32,16.56,37.43-2.89,56.54-14.79c4.19-2.6,8.42-4.84,12.72-6.26c2.26-0.74,4.48-1.4,6.67-1.95c2.78-0.72,5.52-1.29,8.2-1.72c6.9-1.11,13.5-1.32,19.84-0.75c3.01,0.27,5.96,0.71,8.85,1.32c3.7,0.77,7.32,1.81,10.85,3.09c4.14,1.49,8.17,3.31,12.11,5.41c1.83,0.96,3.63,2,5.42,3.08c5.29,3.22,10.43,6.92,15.46,11c4.9,3.63,9.75,7.76,14.55,12.27c30.62,28.81,59.17,73.09,86.24,101.12c17.5,18.12,37.04,32.68,61.39,39.56C386.103,335.038,342.353,332.998,318.463,324.478z" />
          <path fill="#DB8269" d="M377.052,332.399c-24.349-6.877-43.885-21.438-61.387-39.556c-31.31-32.421-64.599-86.593-100.794-113.39c-10.002-8.123-20.45-14.746-31.658-19.001v126.383c22.327-5.253,17.608-15.972,21.299-14.153c23.825-6.561,47.796,11.799,58.086,18.443c19.932,12.895,33.435,25.349,55.861,33.351C342.351,333.001,386.105,335.04,377.052,332.399z" />
          <circle fill="#272525" cx="107.222" cy="54.788" r="6" />
        </svg>
      </div>

      {/* Plateosaurus — center-right */}
      <div className="absolute bottom-[3%] right-[18%] animate-rex-bob" style={{ animationDelay: "-1.5s" }}>
        <svg width="170" height="110" viewBox="0 0 388 388" style={{ transform: "scaleX(-1)" }}>
          <path fill="#ABD1AD" d="M157.225,183.017l18.981,51.49c0,0-8.52,8.489-13.105,12.362c-3.609,3.048-7.305,4.953-8.189,11.847l-0.367,2.864l13.374,2.08l19.662-13.64l6.73-63.428L157.225,183.017z" />
          <path fill="#ABD1AD" d="M176.746,192.734l43.344,38.866c0,0-3.296,10.883-5.426,16.115c-1.676,4.119-4.015,7.246-1.283,13.766l1.135,2.708l13.052-3.273l10.651-19.78l-26.4-59.444L176.746,192.734z" />
          <path fill="#ABD1AD" d="M90.64,175.705l-12.065,34.698c0,0-7.477,1.601-11.217,2.085c-2.944,0.381-5.462,0.109-8.691,3.543l-1.341,1.427l5.452,5.86l14.828-0.461l29.048-32.094L90.64,175.705z" />
          <path fill="#ABD1AD" d="M99.184,185.027l12.227,34.641c0,0-4.843,5.917-7.463,8.629c-2.062,2.134-4.2,3.494-4.579,8.193l-0.158,1.952l7.916,1.176l11.298-9.614l2.668-43.205L99.184,185.027z" />
          <path fill="#ABD1AD" d="M20.679,163.537c8.536,3.388,17.804-4.638,26.808-6.381c4.773-0.92,9.65-1.13,14.35,1.92c2.165,1.406,11.713,4.837,12.499,5.064c0.34,0.097,0.696,0.179,1.054,0.241c0.575,0.109,1.211,0.216,1.396,0.274c0.123,0.022,0.229,0.059,0.352,0.082c4.954,1.076,14.484,18.699,18.302,21.517c3.49,2.569,5.772,5.719,4.14,10.269c-0.62,1.752,10.897,0.791,12.353-0.467c0.93-0.811,0.87-2.741,0.98-4.646c0.043-0.871,0.871-1.487,1.743-1.383c3.141,0.393,6.289,0.658,9.448,1.003c6.009,0.972,30.664,20.332,72.986,22.438c46.777,2.328,42.242-18.739,88.783-29.69c8.913-2.097,61.339-12.595,76.954-12.819c1.28,0.032,33.705-4.74,22.23-6.797c-9.958-1.777-54.598-6.55-66.995-5.212c-13.388,1.461-26.794,2.625-40.217,3.819c-2.736,0.24-5.485-1.111-8.189-1.514c-5.998-0.863-78.195-36.619-138.423-27.607c-4.411,0.66-39.259,10.012-40.727,10.284c-6.458,1.137-12.942,0.954-18.971-2.118c-3.922-2.01-8.339-3.479-11.563-6.316c-4.662-4.114-9.261-7.896-15.048-10.499c-7.53-3.395-16.204-1.371-21.922,3.744C20.055,131.395-25.73,145.116,20.679,163.537z" />
          <path fill="#98C79C" d="M385.057,164.159c-9.958-1.778-54.598-6.551-66.995-5.213c-13.388,1.461-26.794,2.625-40.217,3.819c-2.736,0.24-5.485-1.111-8.189-1.513c-3.958-0.57-36.749-16.333-75.901-24.4v76.403c1.101,0.08,2.208,0.154,3.335,0.21c46.777,2.328,42.242-18.739,88.783-29.69c8.913-2.097,61.34-12.595,76.954-12.819C364.107,170.988,396.532,166.217,385.057,164.159z" />
          <circle fill="#272525" cx="33.755" cy="131.755" r="6" />
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


  // ---- Reset to attract mode ----
  const resetToAttract = useCallback(() => {
    cancelSpeech();
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
  }, [cancelSpeech]);

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
    }, 300);
  }, [transitioning, cancelSpeech]);

  // ---- Enter text mode ----
  const enterTextMode = useCallback(() => {
    if (transitioning) return;
    cancelSpeech();
    setMessages([]);
    setTransitioning(true);
    setTimeout(() => {
      setMode("text");
      setTransitioning(false);
    }, 300);
  }, [transitioning, cancelSpeech]);

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
    }, 300);
  }, [transitioning, cancelSpeech]);

  const switchToText = useCallback(() => {
    if (transitioning) return;
    cancelSpeech();
    setMessages([]);
    setRexMood("idle");
    setTransitioning(true);
    setTimeout(() => {
      setMode("text");
      setTransitioning(false);
    }, 300);
  }, [transitioning, cancelSpeech]);

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
    setRexMood("thinking");
    const text = await stopAndSubmit();
    if (text) {
      sendMessage(text);
    } else {
      // STT returned nothing — go back to ready
      setRexMood("idle");
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
          <div className="w-[300px] h-[340px] mb-2 flex-shrink-0">
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
    // Determine push-to-talk state
    const isRecording = voiceState === "listening";
    const isProcessing = voiceState === "processing" || isLoading;
    const isSpeaking = rexMood === "speaking";
    const isReady = !isRecording && !isProcessing && !isSpeaking;

    const handleTalkButton = () => {
      if (isRecording) {
        handleVoiceSubmit();
      } else if (isReady) {
        resetInactivityTimer();
        startListening();
      }
    };

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

          {/* Push-to-talk button + status */}
          <div className="mt-4 flex flex-col items-center gap-4 min-h-[140px]">
            {/* Ready state — big green mic button */}
            {isReady && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <button
                  onClick={(e) => { e.stopPropagation(); handleTalkButton(); }}
                  disabled={consecutiveErrors >= 3}
                  className="w-[180px] h-[180px] rounded-full bg-[#2a9d8f] text-white flex flex-col items-center justify-center gap-2 active:bg-[#228076] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xl hover:scale-[1.02]"
                >
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                  <span className="text-xl font-extrabold tracking-wide">TAP TO TALK</span>
                </button>
                {micError && (
                  <p className="text-lg text-red-400 font-medium">{micError}</p>
                )}
              </div>
            )}

            {/* Recording state — pulsing red button */}
            {isRecording && (
              <div className="flex flex-col items-center gap-3 animate-fade-in">
                <button
                  onClick={(e) => { e.stopPropagation(); handleTalkButton(); }}
                  className="w-[180px] h-[180px] rounded-full bg-red-500 text-white flex flex-col items-center justify-center gap-2 active:bg-red-700 active:scale-95 transition-all shadow-2xl voice-ring-pulse-red"
                >
                  {/* Stop/send icon */}
                  <svg width="56" height="56" viewBox="0 0 24 24" fill="white">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  <span className="text-xl font-extrabold tracking-wide">TAP TO SEND</span>
                </button>
                <p className="text-2xl text-green-300 font-semibold">Listening...</p>
              </div>
            )}

            {/* Processing state — thinking spinner */}
            {isProcessing && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="w-[120px] h-[120px] rounded-full bg-[#e8722a]/20 flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-[#e8722a]/30 border-t-[#e8722a] rounded-full animate-spin" />
                </div>
                <p className="text-2xl text-[#f5e6c8] font-semibold">Rex is thinking...</p>
              </div>
            )}

            {/* Speaking state — sound bars */}
            {isSpeaking && !isProcessing && (
              <div className="flex flex-col items-center gap-4 animate-fade-in">
                <div className="flex items-end gap-[6px] h-16">
                  {[0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((delay, i) => (
                    <div
                      key={i}
                      className="w-[8px] bg-[#e8722a] rounded-full sound-bar"
                      style={{ height: "100%", animationDelay: `${delay}s` }}
                    />
                  ))}
                </div>
                <p className="text-2xl text-[#e8722a] font-semibold">Rex is talking...</p>
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
