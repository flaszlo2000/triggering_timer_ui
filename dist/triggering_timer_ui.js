import { WSRealtimeCard } from "./triggering_timer_list";

class TriggeringTimer extends HTMLElement {
  setConfig(config) {
    if (!config) {
      throw new Error("Configuration is required");
    }

    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    this._selected_id = null;


    const automation_entities = Object.keys(this._hass.states)
      .filter((entity_id) => entity_id.startsWith('automation.'))
      .map((entity_id) => {
        const friendly_name = this._hass.states[entity_id].attributes.friendly_name || entity_id;
        return { entity_id, friendly_name };
      });

    this.innerHTML = `
        <style>
          select {
            text-align-last: center;
          }

          .time {
            background-color: #1B1931;
            padding: 5px 15px 5px 15px;

            color: #f5f6fa;
          }
    
          .time-label {
            font-size: 18px;
          }

          select, input {
            margin-bottom: 8px;
            border: 0px;
            border-radius: 5px;
          }
    
          @keyframes feedback-animation {
            44% { background-color: #ED9E59; }
            56% { background-color: #ED9E59; }
          }
    
          #automation-content {
            display: flex;
            flex-direction: column;
          }
    
          #automation-container {
            display: flex;
            flex-direction: column;
            justify-content: space-evenly;
          }
    
          .line {
            display: flex;
            justify-content: space-between;
          }
    
          #automation-interaction {
            display: flex;
            justify-content: space-evenly;
          }
    
          #submit {
            background-color: #662249;

            margin-top: 10px;
            padding: 10px;
            border: 0px;
            border-radius: 5px;
            font-size: 18px;
            width: 80%;
            height: 40px;
          }

          #submit:enabled {
            color: white;
          }

          #main-container {
            padding: 0px 8px 8px 8px;
          }

          /*                        fancy select                    */
          /* modified version on: https://github.com/Godsont/Custom-Select-Box.git */
          .select-box {
            display: flex;
            width: 100%;
            flex-direction: column;
          }

          .select-box {
            position: relative;
          }

          .options-container {
            position: absolute;
            top: 100%;
          }

          .select-box .options-container {
            left: 0;
            width: 100%;
            background: #1B1931;
            color: #f5f6fa;
            max-height: 0;
            opacity: 0;
            transition: all 0.4s;
            border-radius: 8px;
            overflow: hidden;
            z-index: 10;
          }

          .selected {
            background: #1B1931;
            border-radius: 8px;
            margin-bottom: 8px;
            color: #f5f6fa;
            position: relative;

            order: 0;
          }

          .select-box .options-container.active {
            max-height: 180px;
            opacity: 1;
            overflow-y: scroll;
          }

          .select-box .options-container::-webkit-scrollbar {
            width: 8px;
            background: #0d141f;
            border-radius: 0 8px 8px 0;
          }

          .select-box .options-container::-webkit-scrollbar-thumb {
            background: #662249;
            border-radius: 0 8px 8px 0;
          }

          .select-box .option,
          .selected {
            padding: 12px 24px;
            cursor: pointer;
          }

          .select-box .option:hover {
            background: #662249;
          }

          .select-box label {
            cursor: pointer;
          }

          .select-box .option .radio {
            display: none;
          }
        </style>
        <ha-card header="Triggering Timer" id="automation-card">
          <div id="main-container">
            <div id="automation-container">
              <div id="automation-content">
                <div class="line">
                  <div class="select-box">
                    <div class="options-container">
                      ${automation_entities.map((automation) =>
                      `<div class="option">
                        <input type="radio" class="radio" id="${automation.entity_id}" />
                        <label for="${automation.entity_id}">${automation.friendly_name}</label>
                      </div>`
                      ).join('')}
                    </div>

                    <div class="selected">
                      Select automation
                    </div>
                  </div>
                </div>
              </div>

              <div class="line">
                <label for="time" class="time-label">After:</label>
                <input type="time" class="time" id="time-input" value="00:05:00" />
              </div>
            </div>

            <div id="automation-interaction">
              <button id="submit" disabled>Start</button>
            </div>
            </div>
          </div>
        </ha-card>
      `;

    this.submit_button = this.querySelector('#submit'); 
    this.submit_button.addEventListener('click', () => {
      const time = this.querySelector('.time').value;
      const time_array = time.split(':');
      const delay_in_millisecs = (parseInt(time_array[0]) * 60 + parseInt(time_array[1])) * 60000;
      this._callService(this._selected_id, delay_in_millisecs);
    });

    const selected = this.querySelector(".selected");
    const optionsContainer = this.querySelector(".options-container");

    const optionsList = this.querySelectorAll(".option");

    selected.addEventListener("click", () => {
      optionsContainer.classList.toggle("active");
    });

    optionsList.forEach(o => {
      o.addEventListener("click", () => {
        selected.innerHTML = o.querySelector("label").innerHTML;
        this._selected_id = o.querySelector("input").id;
        this.submit_button.disabled = false;

        optionsContainer.classList.remove("active");
      });
    });
  }

  _playAnimation(element, animation) {
    element.style.animation = "none";
    void element.offsetWidth;

    element.style.animation = animation;
  }

  _showFeedback() {
    const bg_animation = "feedback-animation 1s linear";

    const automation_container = this.querySelector("#automation-card");
    this.submit_button.disabled = true;
    this.submit_button.style.fontSize = "0px";

    this._playAnimation(automation_container, bg_animation);
    this._playAnimation(this.submit_button, bg_animation);

    setTimeout(() => {
      const selected = this.querySelector(".selected");
      selected.innerHTML = "Select automation";

      const time_input = this.querySelector("#time-input");
      time_input.value = "00:05";

      this.submit_button.style.fontSize = "18px";
    }, 900);
  }

  async _callService(automationEntityId, delay) {
    const delay_time = delay / 1000;
    const friendly_name = this._hass.states[automationEntityId].attributes.friendly_name;

    const data = {
      automation_entity_id: automationEntityId,
      time_delay: delay_time,
      name: friendly_name
    };

    await this._hass.callService('triggering_timer', 'trigger_after_delay', data);

    this._showFeedback();
  }
}

customElements.define('triggering-timer-card', TriggeringTimer);
customElements.define('triggering-timer-list-card', WSRealtimeCard);
