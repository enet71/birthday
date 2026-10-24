import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  public readonly audioContext: AudioContext = new AudioContext({
    sampleRate: 24000,
  });
}
