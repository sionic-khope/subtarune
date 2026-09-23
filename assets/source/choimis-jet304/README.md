# 냄트기 항공기 소리 — BUILD304

Source: [Jet Plane Flyby.flac by qubodup](https://freesound.org/people/qubodup/sounds/189446/), published 2013-05-26, retrieved 2026-09-23. The source page labels this recording [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) and describes a plane flying past the camera, extracted from a US Government agency video. That description is the uploader's provenance claim; the game does not claim an independently verified aircraft model or recording agency.

Preserved file: `jet-plane-flyby-preview.mp3`, the site's [public high-quality MP3 preview](https://cdn.freesound.org/previews/189/189446_71257-hq.mp3), not its login-only FLAC. 17.656813 s, 48 kHz stereo, 410592 bytes. SHA256 `be708000c497123efe5747a0ab0f0d7f11c742834a13af890ae5497def3035a2`.

Existing inventory had synthetic rocket/wind and the short DELTARUNE wing cue, but no aircraft engine recording. Three clips use this one licensed recording, without synthesized tones or pitch/speed changes:

```sh
ffmpeg -i jet-plane-flyby-preview.mp3 -ss 1.5 -t 2.25 -af 'afade=t=in:d=0.12,afade=t=out:st=1.8:d=0.45' -codec:a libmp3lame -q:a 2 naem_jet_approach.mp3
ffmpeg -i jet-plane-flyby-preview.mp3 -filter_complex '[0:a]atrim=start=3.5:end=6.5,asetpts=PTS-STARTPTS,asplit[a][b];[a][b]acrossfade=d=0.4:c1=tri:c2=tri,atrim=start=2.6:end=5.2,asetpts=PTS-STARTPTS[out]' -map '[out]' -codec:a libmp3lame -q:a 2 naem_jet_engine.mp3
ffmpeg -i jet-plane-flyby-preview.mp3 -ss 6.5 -t 2.6 -af 'afade=t=in:d=0.08,afade=t=out:st=0.7:d=1.9' -codec:a libmp3lame -q:a 2 naem_jet_depart.mp3
```

Approach starts once at the existing `catch` beat (volume0.42), while the unchanged claw-contact `wing` remains at0.65s. The2.25s approach ends at the close jet reveal. The engine's0.4s crossfade joins the same original segment into a2.6s cyclic bed, played once with native looping at volume0.12 under the flight dialogue. `flyaway` stops that loop and plays the2.6s departure at volume0.5. Disposal/title/map cleanup pauses every scene-owned handle; no timers can restart it. Vs. Lancer and all dialogue/geometry remain unchanged.

Runtime SHA256:

- approach: `f3e926d937c76ca689283a351678420c753260cb01fddfcd4c42093788db5e73`
- engine: `98658ff2d2308b02b55515507ed073f3b3866fe8e00659959002f19826871937`
- depart: `968843d0e6cf93cbaeccbed0412a3b2a65634e7927116c8389ce7ea85e1bb48b`

Verification distinguishes whole-file decoding and live browser playback clocks from subjective listening approval. Fresh execution evidence is under `.omc/evidence/choimis304/jet/`.
