import { createBrowserHistory } from 'history';

const history = createBrowserHistory();

export const navigate = (path) => {
  if (window.location.pathname !== path) {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
};

export default history;
