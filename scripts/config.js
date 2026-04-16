/**
 * get site config
 */
export default function getConfig() {
  if (window.adobeforum && window.adobeforum.config) {
    return window.adobeforum.config;
  }

  const HOSTS = ['main--adobe-forum--sdp00.aem.page', 'main--adobe-forum--sdp00.aem.live'];

  const currentHost = window.location.hostname;
  const isProd = HOSTS.includes(currentHost);
  const ims = {
    client_id: 'adobeforum',
    environment: isProd ? 'prod' : 'stg1',
  };

  window.adobeforum = window.adobeforum || {};
  window.adobeforum.config = {
    ims,
    adobeIoEndpoint: `https://293924-adobeconnectmw${!isProd ? '-dev' : ''}.adobeio-static.net/api/v1/web/adobe-connect`,
  };
  return window.adobeforum.config;
}
