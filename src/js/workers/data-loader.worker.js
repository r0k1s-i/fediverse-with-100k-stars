self.onmessage = function (e) {
  const dataFile = e.data.url;
  const SCALE_FACTOR = e.data.scale || 5;
  const startedAt = Date.now();

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

      // Process data - scale positions
      // This is computationally expensive for large arrays, so good to do in worker
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (item && item.position) {
          item.position.x /= SCALE_FACTOR;
          item.position.y /= SCALE_FACTOR;
          item.position.z /= SCALE_FACTOR;
        }
      }
      self.postMessage({
        status: "success",
        data: data,
        meta: {
          count: data.length,
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
