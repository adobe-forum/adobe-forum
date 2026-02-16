import { html, render } from '../../vendor/htm-preact.js';
import { readBlockConfig } from '../../scripts/aem.js';

const ProfileCard = ({ title, joined, children, footer }) => html`
  <div class="settings-card">
    <div class="card-header">
      <div class="header-left">
        <span class="card-title">${title}</span>
      </div>
      ${joined && html`<div class="header-right"><span class="joined-date">Joined ${joined}</span></div>`}
    </div>
    <div class="card-content">
      ${children}
    </div>
    ${footer && html`<div class="card-footer">${footer}</div>`}
  </div>
`;

const ProfileSettings = ({ config }) => {
  return html`
    <div class="profile-settings-container">
      <div class="settings-grid">
        <div class="settings-column">
          <${ProfileCard} title="Your Profile" joined="2/6/26" footer=${html`<button class="edit-btn">Edit</button>`}>
            <div class="user-profile">
              <div class="avatar-container">
                <div class="avatar-circle"><span class="icon-camera"></span></div>
              </div>
              <div class="user-info">
                <h3>Deepak J</h3>
                <p>+91 9094599457</p>
              </div>
            </div>
          <//>

          <${ProfileCard} title="Emails" footer=${html`<button class="add-btn">Add Email</button>`}>
            <div class="data-row primary">
              <span class="pill">Primary</span>
              <p>rehman@gmail.com</p>
            </div>
            <div class="data-row">
              <p>manv14@gmail.com</p>
            </div>
            <button class="text-link">See all email(4)</button>
          <//>
        </div>

        <div class="settings-column">
          <${ProfileCard} title="Address">
            <div class="data-row primary">
              <span class="pill">Primary</span>
              <p>119 Sarjapur, Bangalore 1234<br/>Karnataka</p>
            </div>
            <div class="data-row">
               <p>422 Fariada palace, Pallibiddut Road<br/>Goa</p>
            </div>
          <//>

          <${ProfileCard} title="Account Options">
            <div class="option-item">Language: India <span class="arrow-down"></span></div>
            <div class="option-item">Time zone: (GMT+6)Time in India <span class="arrow-down"></span></div>
            <div class="danger-zone">Close your account</div>
          <//>
        </div>
      </div>
    </div>
  `;
};

export default function decorate(block) {
  const config = readBlockConfig(block);
  block.innerHTML = '';
  render(html`<${ProfileSettings} config=${config} />`, block);
}