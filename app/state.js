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
      nmDir: '',
      installing: false,
      // UI
      settingsOpen: false,
      view: 'index',
      search: '',
      searchQuery: [],
      searchPage: 1,
      searchPageSize: 20
    };
    this.step = 0;
    this.history = [];
  },
  set(obj, cb=null){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, _.cloneDeep(obj));
    console.log('STATE: ', this.state);
    this.trigger(this.state);
    ++this.step;
    this.history.push({
      object: _.cloneDeep(this.state),
      step: this.step
    });
    if (cb) {
      _.defer(()=>cb());
    }
  },
  get(){
    return this.state;
  },
  reverseAtStep(step){
    let refStep = _.findIndex(this.history, {step: step});
    let refObject = this.history[refStep].object;
    this.state = refObject;
    this.trigger(this.state);
  },
  reverseOnce(){
    this.reverseAtStep(this.step - 1);
  }
});

window.state = state;
export default state;