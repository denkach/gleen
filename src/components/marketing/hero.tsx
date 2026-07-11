'use client';

import { useState } from 'react';

import { BeamInput, type BeamDemoState } from './beam-input';
import { PrismScene } from './prism-scene';

export function Hero() {
  const [demoState, setDemoState] = useState<BeamDemoState>('idle');
  return (
    <section className="hero" id="product">
      <div className="container hero-grid">
        <div className="hero-copy">
          <span className="eyebrow">One video / four useful outputs</span>
          <h1 className="display-xl">
            Watch less. <br />
            Understand more.
          </h1>
          <p className="body-lg">
            Turn any YouTube video into a structured summary, smart flashcards,
            precise timestamps, and export-ready knowledge.
          </p>
          <BeamInput onDemoStateChange={setDemoState} />
          <div className="hero-caption">
            <span className="ray" />
            <span>
              No card required · Try an example · Your first analysis is free
            </span>
          </div>
        </div>
        <PrismScene demoState={demoState} />
      </div>
      <div className="scroll-cue">Move through the spectrum</div>
    </section>
  );
}
