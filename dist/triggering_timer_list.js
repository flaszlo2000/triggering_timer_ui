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
                    background-color: #662249;
                    border: 0px;
                }

                #data .viewer-line:first-child button {
                    border-top-right-radius: 9px;
                }

                #data .viewer-line:last-child button {
                    border-bottom-right-radius: 9px;
                }

                button:active {
                    background-color: #A34054;
                    color: black;
                }
                
                #data {
                    display: flex;
                    flex-direction: column;
                    gap: 5px;
                }

                #no-timers {
                    display: flex;
                    text-align: center;
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
            .then(() => {})
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

    handleEvent(event) {
        const dataDiv = this.shadowRoot.querySelector('#data');

        if (event && Object.keys(event).length > 0) {
            dataDiv.innerHTML = Object.entries(event)
                .map(([uuid, values]) => `
                    <div class="viewer-line">
                        <div class="line">
                            <div class="line-automation-name">${values[0]}</div>
                            <div>Ends: ${values[1]}</div>
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
