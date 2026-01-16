self.onmessage = function(e) {
    const dataFile = e.data.url;
    
    fetch(dataFile)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const SCALE_FACTOR = 5;
            // Process data - scale positions
            // This is computationally expensive for large arrays, so good to do in worker
            for (let i = 0; i < data.length; i++) {
                if (data[i].position) {
                    data[i].position.x /= SCALE_FACTOR;
                    data[i].position.y /= SCALE_FACTOR;
                    data[i].position.z /= SCALE_FACTOR;
                }
            }
            self.postMessage({ status: 'success', data: data });
        })
        .catch(error => {
            self.postMessage({ status: 'error', error: error.message });
        });
};
