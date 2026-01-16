// Use global expect from chai
const { expect } = window;
import { loadFediverseData } from '../../src/js/core/fediverse.js';

describe('Data Loader (Worker)', () => {
    let originalWorker;
    let originalXHR;
    
    beforeEach(() => {
        originalWorker = window.Worker;
        originalXHR = window.XMLHttpRequest;
        
        // Mock setLoadMessage
        window.setLoadMessage = function(msg) {
            console.log('Load Message:', msg);
        };
    });

    afterEach(() => {
        window.Worker = originalWorker;
        window.XMLHttpRequest = originalXHR;
        delete window.setLoadMessage;
    });

    it('should use Worker when available', (done) => {
        const mockData = [{ position: { x: 10, y: 10, z: 10 }, name: 'Test', domain: 'example.com' }];
        
        // Mock Worker
        class MockWorker {
            constructor(url) {
                this.url = url;
                setTimeout(() => {
                    this.onmessage({ 
                        data: { 
                            status: 'success', 
                            data: mockData 
                        } 
                    });
                }, 10);
            }
            
            postMessage(msg) {
                // received message
            }
            
            terminate() {}
        }
        
        window.Worker = MockWorker;

        loadFediverseData('dummy.json', (data) => {
            expect(data).to.deep.equal(mockData);
            done();
        });
    });

    it('should fallback to XHR when Worker fails', (done) => {
        const mockData = [{ position: { x: 10, y: 10, z: 10 }, name: 'Fallback', domain: 'fallback.com' }];
        
        // Mock Worker that fails
        class MockWorker {
            constructor() {
                setTimeout(() => {
                    if (this.onerror) this.onerror('Worker Init Failed');
                }, 10);
            }
            postMessage() {}
            terminate() {}
        }
        
        window.Worker = MockWorker;

        // Mock XHR for fallback
        class MockXHR {
            open(method, url) {}
            send() {
                this.responseText = JSON.stringify(mockData);
                this.onload();
            }
            addEventListener(type, cb) {
                if (type === 'load') this.onload = cb;
            }
        }
        window.XMLHttpRequest = MockXHR;

        loadFediverseData('dummy.json', (data) => {
            expect(data.length).to.equal(1);
            // Note: Fallback logic scales positions by 5 in the XHR callback
            // Input: 10 -> 10/5 = 2
            expect(data[0].position.x).to.equal(2); 
            expect(data[0].name).to.equal('Fallback');
            done();
        });
    });
});
