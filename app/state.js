import Reflux from 'reflux';
import _ from 'lodash';
import os from 'os';

var state = Reflux.createStore({
  init(){
    this.state = {
      // Core
      init: true,
      homedir: os.homedir(),
      width: window.innerWidth,
      height: window.innerHeight,
      tableData: [],
      title: 'npmatic',
      pkgs: [],
      registry: [],
      installed: [],
      global: true,
      nmDir: '/usr/lib/node_modules/',
      installing: false,
      // UI
      settingsOpen: false,
      view: 'index',
      search: '',
      searchQuery: [],
      searchPage: 1,
      searchPageSize: 20
    };
  },
  set(obj){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, _.cloneDeep(obj));
    console.log('STATE: ', this.state);
    this.trigger(this.state);
  },
  get(){
    return this.state;
  }
});

window.state = state;
export default state;