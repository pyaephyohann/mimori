import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activeFacing,
  cameraConstraints,
  cameraFailure,
  describeCameraError,
  trackSupportsTorch,
} from "./camera.ts";

function errorNamed(name: string): Error {
  const error = new Error("camera failed");
  error.name = name;

  return error;
}

function streamWithSettings(
  settings: MediaTrackSettings,
): MediaStream {
  return {
    getVideoTracks: () => [{ getSettings: () => settings }],
  } as unknown as MediaStream;
}

describe("describeCameraError", () => {
  it("maps a blocked permission", () => {
    assert.equal(describeCameraError(errorNamed("NotAllowedError")).kind, "denied");
    assert.equal(
      describeCameraError(errorNamed("PermissionDeniedError")).kind,
      "denied",
    );
  });

  it("maps a missing camera", () => {
    assert.equal(describeCameraError(errorNamed("NotFoundError")).kind, "missing");
  });

  it("maps a camera another app is using", () => {
    assert.equal(describeCameraError(errorNamed("NotReadableError")).kind, "busy");
  });

  it("maps an unsatisfiable facing mode", () => {
    assert.equal(
      describeCameraError(errorNamed("OverconstrainedError")).kind,
      "overconstrained",
    );
  });

  it("maps an insecure origin", () => {
    const failure = describeCameraError(errorNamed("SecurityError"));

    assert.equal(failure.kind, "insecure");
    assert.equal(failure.canRetry, false);
  });

  it("falls back to a retryable unknown error", () => {
    const failure = describeCameraError(errorNamed("SomethingElse"));

    assert.equal(failure.kind, "unknown");
    assert.equal(failure.canRetry, true);
  });

  it("handles a rejection that is not an error object", () => {
    assert.equal(describeCameraError(undefined).kind, "unknown");
    assert.equal(describeCameraError("nope").kind, "unknown");
  });

  it("gives every kind a title and a message", () => {
    for (const kind of [
      "denied",
      "missing",
      "busy",
      "overconstrained",
      "insecure",
      "unsupported",
      "unknown",
    ] as const) {
      const failure = cameraFailure(kind);

      assert.ok(failure.title.length > 0);
      assert.ok(failure.message.length > 0);
    }
  });
});

describe("cameraConstraints", () => {
  it("asks for the requested side with an ideal, not exact, constraint", () => {
    const constraints = cameraConstraints("environment");
    const video = constraints.video as MediaTrackConstraints;

    assert.equal(constraints.audio, false);
    assert.deepEqual(video.facingMode, { ideal: "environment" });
    assert.deepEqual(video.width, { ideal: 1280 });
    assert.deepEqual(video.height, { ideal: 960 });
  });

  it("prefers the front camera by default when asked", () => {
    const video = cameraConstraints("user").video as MediaTrackConstraints;

    assert.deepEqual(video.facingMode, { ideal: "user" });
  });
});

describe("activeFacing", () => {
  it("trusts the track's real facing mode", () => {
    assert.equal(
      activeFacing(streamWithSettings({ facingMode: "user" }), "environment"),
      "user",
    );
  });

  it("keeps the request when the track does not report one", () => {
    assert.equal(
      activeFacing(streamWithSettings({}), "environment"),
      "environment",
    );
  });
});

describe("trackSupportsTorch", () => {
  it("is true only when the track advertises a torch", () => {
    const withTorch = {
      getCapabilities: () => ({ torch: true }),
    } as unknown as MediaStreamTrack;
    const withoutTorch = {
      getCapabilities: () => ({}),
    } as unknown as MediaStreamTrack;

    assert.equal(trackSupportsTorch(withTorch), true);
    assert.equal(trackSupportsTorch(withoutTorch), false);
    assert.equal(trackSupportsTorch(null), false);
  });
});
