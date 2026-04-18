import { Composition } from "remotion";
import { MultiplyPromo, PROMO_FPS, PROMO_DURATION_FRAMES, PROMO_WIDTH, PROMO_HEIGHT } from "./MultiplyPromo";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="MultiplyPromo"
        component={MultiplyPromo}
        durationInFrames={PROMO_DURATION_FRAMES}
        fps={PROMO_FPS}
        width={PROMO_WIDTH}
        height={PROMO_HEIGHT}
      />
    </>
  );
};
