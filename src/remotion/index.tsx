import React from "react";
import { Composition } from "remotion";
import { VideoComposition } from "./VideoComposition";
import type { Script, Caption } from "@/types";

// Props type for the composition
export interface VideoCompositionProps {
  script: Script;
  audioUrl: string;
  captions: Caption[];
  imageUrls: string[];
}

// Default props for preview/testing
const defaultProps: VideoCompositionProps = {
  script: {
    title: "Sample Video",
    scenes: [
      {
        id: 1,
        text: "This is a sample scene for preview.",
        imagePrompt: "A beautiful sunset over mountains",
        duration: 5,
      },
    ],
    totalDuration: 5,
  },
  audioUrl: "",
  captions: [],
  imageUrls: [],
};

// Calculate duration in frames based on script
const calculateDurationInFrames = (script: Script, fps: number): number => {
  return Math.max(script.totalDuration * fps, 150); // Min 5 seconds
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="VideoComposition"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={VideoComposition as React.FC<any>}
        durationInFrames={calculateDurationInFrames(defaultProps.script, 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
      />
    </>
  );
};
