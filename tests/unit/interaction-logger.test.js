import {
  buildInteractionLogEntry,
  formatInteractionLogEntry,
  shouldLog,
} from "../../src/js/utils/interaction-logger.js";

describe("interaction-logger", function () {
  it("builds a normalized log entry with defaults", function () {
    var entry = buildInteractionLogEntry(
      {
        level: 3,
        category: "fediverse",
        name: "click",
        data: { domain: "mastodon.social", zoom: 5 },
      },
      { timestamp: "2026-01-16T00:00:00.000Z", source: "unit-test" },
    );

    expect(entry).to.deep.equal({
      timestamp: "2026-01-16T00:00:00.000Z",
      level: "INFO",
      category: "fediverse",
      name: "click",
      data: { domain: "mastodon.social", zoom: 5 },
      source: "unit-test",
    });
  });

  it("formats a text log line deterministically", function () {
    var entry = {
      timestamp: "2026-01-16T00:00:00.000Z",
      level: "DEBUG",
      category: "fediverse",
      name: "hover",
      data: { zoom: 5, domain: "mastodon.social" },
      source: "unit-test",
    };

    var line = formatInteractionLogEntry(entry);

    expect(line).to.equal(
      "[2026-01-16T00:00:00.000Z] [DEBUG] fediverse.hover domain=mastodon.social source=unit-test zoom=5",
    );
  });

  it("honors the current log level", function () {
    expect(shouldLog(1, 3)).to.equal(true);
    expect(shouldLog(3, 3)).to.equal(true);
    expect(shouldLog(4, 3)).to.equal(false);
  });
});
