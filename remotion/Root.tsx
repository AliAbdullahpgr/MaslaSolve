import { Composition } from "remotion";
import { Promo } from "./Promo";

// 30fps, 95 seconds = 2850 frames.
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Promo"
        component={Promo}
        durationInFrames={2850}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
