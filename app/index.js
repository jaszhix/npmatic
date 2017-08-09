import React from 'react';
import {render} from 'react-dom';
import {AppContainer} from 'react-hot-loader';
import Root from './root';
//import './app.global.css';

render(
  <AppContainer>
    <Root history={history} />
  </AppContainer>,
  document.getElementById('root')
);

if (module.hot) {
  module.hot.accept('./root', () => {
    const NextRoot = require('./root'); // eslint-disable-line global-require
    render(
      <AppContainer>
        <NextRoot history={history} />
      </AppContainer>,
      document.getElementById('root')
    );
  });
}
