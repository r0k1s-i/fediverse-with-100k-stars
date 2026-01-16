self.onmessage = function (e) {
  const dataFile = e.data.url;
  const SCALE_FACTOR = e.data.scale;
  const startedAt = Date.now();

  if (!SCALE_FACTOR) {
     self.postMessage({
        status: "error",
        error: "Configuration error: Missing scale factor",
        meta: { url: dataFile }
     });
     return;
  }

  fetch(dataFile)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      if (!Array.isArray(data)) {
        throw new Error("Data format error: expected array");
      }

      let validCount = 0;
      let invalidCount = 0;
      const firstErrors = [];
      const MAX_ERRORS = 5;

      const validData = [];

      for (let i = 0; i < data.length; i++) {
        const item = data[i];

        if (!item || !item.position ||
            typeof item.position.x !== 'number' ||
            typeof item.position.y !== 'number' ||
            typeof item.position.z !== 'number' ||
            typeof item.domain !== 'string' || item.domain.length === 0) {

            invalidCount++;
            if (firstErrors.length < MAX_ERRORS) {
                firstErrors.push({
                    index: i,
                    reason: "Missing/invalid position or domain",
                    item: item ? JSON.stringify(item).substring(0, 100) : "null"
                });
            }
            continue;
        }

        item.position.x /= SCALE_FACTOR;
        item.position.y /= SCALE_FACTOR;
        item.position.z /= SCALE_FACTOR;
        validData.push(item);
        validCount++;
      }

      if (validData.length === 0) {
          throw new Error("Data format error: No valid instances found (checked " + data.length + " items)");
      }

      self.postMessage({
        status: "success",
        data: validData,
        meta: {
          count: validData.length,
          valid: validCount,
          invalid: invalidCount,
          errors: firstErrors,
          ms: Date.now() - startedAt,
        },
      });
    })
    .catch((error) => {
      self.postMessage({
        status: "error",
        error: error.message,
        meta: {
          url: dataFile,
          ms: Date.now() - startedAt,
        },
      });
    });
};
