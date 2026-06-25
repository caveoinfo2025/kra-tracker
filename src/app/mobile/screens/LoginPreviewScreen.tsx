"use client";
import { useState } from "react";
import MIcon from "../components/MIcon";

interface LoginPreviewScreenProps {
  onContinue?: () => void;
}

/** UI-only preview of the secure sign-in screen — not wired to real auth. */
export default function LoginPreviewScreen({ onContinue }: LoginPreviewScreenProps) {
  const [showNote, setShowNote] = useState(false);

  return (
    <div className="m-screen">
      <div className="m-login">
        <div className="mark">
          <MIcon name="shield" size={28} />
        </div>
        <div className="name">
          CAVEO<span className="dot">.</span>
        </div>
        <div className="tag">Engineering Secure Digital Futures</div>

        <button
          className="sso-btn"
          onClick={() => {
            setShowNote(true);
            onContinue?.();
          }}
        >
          <MIcon name="microsoft" size={16} />
          Sign in with Microsoft Entra ID
        </button>

        {showNote && (
          <p className="preview-note">
            This is a static design preview. Real sign-in happens via Microsoft Entra ID at /login.
          </p>
        )}

        <div className="foot">
          <MIcon name="shield" size={12} color="rgba(255,255,255,0.4)" />
          256-bit encrypted · SOC 2-aligned access
        </div>
      </div>
    </div>
  );
}
