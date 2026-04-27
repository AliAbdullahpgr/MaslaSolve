import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { HeroIntro } from "./scenes/HeroIntro";
import { VoiceReport } from "./scenes/VoiceReport";
import { Duplicates } from "./scenes/Duplicates";
import { AdminTriage } from "./scenes/AdminTriage";
import { ImpactStats } from "./scenes/ImpactStats";
import { AISeekho } from "./scenes/AISeekho";
import { Outro } from "./scenes/Outro";

// Scene plan @ 30fps · 2850 total frames · 95 seconds
const SCENES = [
  { id: "hero", from: 0, duration: 270, render: HeroIntro },           // 9s  intro
  { id: "voice", from: 270, duration: 540, render: VoiceReport },      // 18s voice + auto-fill
  { id: "dupes", from: 810, duration: 360, render: Duplicates },       // 12s duplicate detection
  { id: "triage", from: 1170, duration: 660, render: AdminTriage },    // 22s agent trace
  { id: "impact", from: 1830, duration: 300, render: ImpactStats },    // 10s big numbers
  { id: "seekho", from: 2130, duration: 450, render: AISeekho },       // 15s built-with credits
  { id: "outro", from: 2580, duration: 270, render: Outro },           // 9s  logo close
];

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      {SCENES.map((scene) => {
        const Comp = scene.render;
        return (
          <Sequence key={scene.id} from={scene.from} durationInFrames={scene.duration}>
            <Comp startFrame={0} endFrame={scene.duration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
