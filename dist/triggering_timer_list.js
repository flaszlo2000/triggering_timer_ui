export class WSRealtimeCard extends HTMLElement {
    constructor() {
        super();

        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .value {
                    margin: 4px 0;
                    color: gray;
                }

                .line {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    flex-grow: 4;

                    padding: 5px;
                    overflow: auto;
                }

                .line-automation-name {
                    font-size: 18px;
                }

                .viewer-line {
                    display: flex;
                }

                button {
                    width: 100%;
                    height: 100%;
                    padding: 6px;
                    border: 0px;
                }

                button:active {
                    color: black;
                }

                .cancel-button {
                    background-color: #662249;
                }

                .cancel-button:active {
                    background-color: #A34054;
                }

                #data .viewer-line:first-child .cancel-button {
                    border-top-right-radius: 9px;
                }

                #data .viewer-line:last-child .cancel-button {
                    border-bottom-right-radius: 9px;
                }
                
                .config-button {
                    background-color: transparent;
                    color: #ED9E59;
                }

                #data {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;

                    max-height: 250px;
                    overflow-y: auto;

                    direction: rtl;
                }

                #data * {
                    direction: ltr;
                }

                #data::-webkit-scrollbar {
                    width: 8px;
                    background: #0d141f;
                    border-radius: 10px 0px 0px 10px;
                }

                #data::-webkit-scrollbar-thumb {
                    background: #1B1931;
                    border-radius: 10px 0px 0px 10px;
                }

                #no-timers {
                    display: flex;
                    align-self: center;
                    padding: 5px;
                }
                </style>
            <ha-card>
                <div id="data">
                    <div id="no-timers">Fetching data...</div>
                </div>
            </ha-card>
        `;

        this._subscriptionId = null;
        setInterval(this.updateTimers, 1000);
    }

    async subscribeToUpdates() {
        try {
            this._subscriptionId = await this._hass.connection.subscribeMessage(
                (event) => this.handleEvent(event),
                { type: "triggering_timer/get_timers" }
            );
        } catch (error) {
            console.error("Error subscribing to updates:", error);
        }
    }

    connectedCallback() {
        this.subscribeToUpdates()
            .then(() => { })
            .catch((error) => console.error('Failed to subscribe:', error));
    }

    disconnectedCallback() {
        if (this._subscriptionId) {
            this._subscriptionId = null;
        }
    }

    set hass(hass) {
        this._hass = hass;
    }

    updateTimers() {
        const timer_divs = this.shadowRoot.querySelectorAll('.timer-div');
    
        timer_divs.forEach(timer_div => {
            const targetTime = new Date(timer_div.getAttribute('data-time')).getTime();
            const now = new Date().getTime();
    
            const timeDifference = targetTime - now;
    
            if (timeDifference <= 0) {
                timer_div.innerHTML = "";
            } else {
                const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
                const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + days * 24;
                const minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);
    
                timer_div.innerHTML = `${hours}h ${minutes}m ${seconds}s`;
            }
        });
    }

    handleEvent(event) {
        const dataDiv = this.shadowRoot.querySelector('#data');

        if (event && Object.keys(event).length > 0) {
            dataDiv.innerHTML = Object.entries(event)
                .map(([uuid, values]) => `
                    <div class="viewer-line">
                        <div>
                            <button class="config-button">
                                <ha-icon icon="mdi:cog-outline"></ha-icon>	
                            </button>
                        </div>
                        <div class="line">
                            <div class="line-automation-name">${values[0]}</div>
                            <div class="timer-div" data-time="${values[1]}"></div>
                        </div>
                        <div>
                            <button id="${uuid}" class="cancel-button">Cancel</button>
                        </div>
                    </div>
                `)
                .join('');

            this.shadowRoot.querySelectorAll('.cancel-button').forEach(button => {
                button.addEventListener("click", () => this.handleCancel(button.getAttribute("id")));
            });
        } else {
            dataDiv.innerHTML = '<div id="no-timers">No timers found.</div>';
        }
    }

    handleCancel(uuid) {
        this._hass.connection.sendMessage({
            type: 'triggering_timer/cancel_timer',
            uuid: uuid,
        });
    }

    setConfig(config) { }
}
