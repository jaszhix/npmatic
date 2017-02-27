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
      lastSearch: '',
      searchQuery: [],
      searchPage: 1,
      searchPageSize: 20,
      searchLoading: false
    };
    this.index = 0;
    this.history = [];
  },
  set(obj, cb=null){
    console.log('STATE INPUT: ', obj);
    _.assignIn(this.state, _.cloneDeep(obj));
    console.log('STATE: ', this.state);
    this.trigger(this.state);

    // If the user navigates to a new view while behind the current index, make sure it becomes the current index.
    if (this.index < this.history.length - 1) {
      this.history = _.slice(this.history, 0, this.index);
    }

    // Record this state object to our history collection.
    if (!obj.hasOwnProperty('search')) {
      this.index = this.history.length;
      this.history.push({
        object: _.clone(this.state),
        index: this.index
      });
    }

    if (cb) {
      _.defer(()=>cb());
    }
  },
  get(){
    return this.state;
  },
  moveToIndex(index){
    let refIndex = _.findIndex(this.history, {index: index});
    if (refIndex === -1 || this.history[refIndex].object.view === 'index') {
      refIndex = 0;
    }

    let refObject = this.history[refIndex].object;

    // Don't allow reversing to state in a search view as the asyc handlers will keep the user stuck.
    if (index < this.index && refObject.view === 'search') {
      this.moveToIndex(index - 2);
      return;
    }

    this.index = index;
    console.log('STATE INDEX: ', this.index);
    this.state = refObject;
    this.trigger(this.state);
  },
  reverseOnce(){
    let offset = this.state.view === 'search' ? 2 : 1;
    this.moveToIndex(this.index - offset);
  },
  forwardOnce(){
    if (this.index < this.history.length - 1) {
      this.moveToIndex(this.index + 1);
    }
  },
  canMoveForward(){
    return this.index < this.history.length - 1 && this.index > 0;
  },
  canMoveBackwards(){
    return this.index > 0;
  }
});

window.state = state;
export default state;