import state from './state';
import React from 'react';
import ReactDOM from 'react-dom';
import _ from 'lodash';
import $ from 'jquery';
import {remote} from 'electron';
import kmp from 'kmp';
import ReactUtils from 'react-utils';
import ReactMarkdown from 'react-markdown';
import onClickOutside from 'react-onclickoutside';
import fs from 'fs';
import names from 'all-the-package-names';
import execa from 'execa';
import sudo from 'sudo-prompt';
import toArray from 'object-to-arrays';
import space from 'to-space-case';
import pkginfo from 'npm-registry-package-info';
import openExternal from 'open-external';

const {Menu, MenuItem, dialog} = remote;

import Reflux from 'reflux';

// Temporary dev context menu
const contextMenu = new Menu();
contextMenu.append(new MenuItem({
  label: 'Reload',
  accelerator: 'CmdOrCtrl+R',
  click (item, focusedWindow) {
    if (focusedWindow) {
      focusedWindow.reload();
    }
  }
}));
contextMenu.append(new MenuItem({type: 'separator'}));
contextMenu.append(new MenuItem({
  label: 'Toggle Developer Tools',
  accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
  click (item, focusedWindow) {
    if (focusedWindow) {
      focusedWindow.webContents.toggleDevTools();
    }
  }
}));

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  contextMenu.popup(remote.getCurrentWindow());
}, false);



var PackageColumn = React.createClass({
  getInitialState(){
    return {
      subItemHover: -1
    };
  },
  componentDidMount(){
    _.defer(()=>{
      $('a').on('click', (e)=>{
        e.preventDefault();
        openExternal(e.target.href);
      });
    });
  },
  handleDependencyClick(key){
    var p = this.props;
    if (p.global) {
      state.set({view: 'search', search: key});
    } else {
      var refDep = _.findIndex(p.installed, {name: key});
      if (refDep !== -1) {
        state.set({package: p.installed[refDep], title: p.installed[refDep].name});
      } else {
        state.set({view: 'search', search: key});
      }
    }
  },
  render(){
    var textOverflow = {
      whiteSpace: 'nowrap',
      width: `${this.props.width / 7}px`,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      display: 'inline-block'
    };
    return (
      <div className="column">
        {this.props.items.map((item, i)=>{
          if (!_.isEmpty(item.value) && item.key !== 'data' && item.key !== 'name') {
            return (
              <div key={i} className="ui grid stacked segments">
                <div className="two column row">
                  <div className={`${_.isArray(item.value) ? 'three' : 'three'} wide column`} style={{fontWeight: '500'}}>{item.key.length <= 2 ? item.key.toUpperCase() : _.upperFirst(item.key)}</div>
                  {item.key === 'description' || item.key === 'readme' ?
                  <div ref="md" className="thirteen wide column">
                    <ReactMarkdown source={item.value} />
                  </div>
                  :
                  <div className="thirteen wide column" style={textOverflow}>
                    {_.isArray(item.value) ? 
                      <div onMouseLeave={()=>this.setState({subItemHover: -1})}>
                        {item.value.map((subItem, s)=>{
                          if (_.isArray(subItem)) {
                            var isDependencies = item.key.indexOf('depend') !== -1;
                            return (
                              <div 
                              key={s} 
                              className="ui grid segments" 
                              style={{backgroundColor: this.state.subItemHover === `${item.key}-${s}` && isDependencies ? 'rgb(249, 250, 251)' : 'initial'}}
                              onClick={item.key.indexOf('depend') !== -1 ? ()=>this.handleDependencyClick(subItem[0]) : null} 
                              onMouseEnter={item.key.indexOf('depend') !== -1 ? ()=>this.setState({subItemHover: `${item.key}-${s}`}) : null}>
                                <div className={`${isDependencies ? 'ten' : 'four'} wide column`} style={{fontWeight: '500'}}>{item.key.indexOf('depend') === -1 && item.key !== 'scripts' ? subItem[0].length <= 3 ? subItem[0].toUpperCase() : _.upperFirst(subItem[0]) : subItem[0]}</div>
                                <div className={`${isDependencies ? 'six' : 'twelve'} wide column`} style={textOverflow}>{subItem[1]}</div>
                              </div>
                            );
                  
                          } else if (_.isString(subItem)) {
                            return (
                              <div key={s} className="ui grid segment">
                                <div className="sixteen wide column" style={textOverflow}>{subItem}</div>
                              </div>
                            );
                          } else {
                            var keys = _.keys(subItem);
                            return keys.map((key, k)=>{
                              return (
                                <div key={k} className="ui grid segments">
                                  <div className="three wide column" style={{fontWeight: '500'}}>{_.upperFirst(key)}</div>
                                  <div className="thirteen wide column" style={textOverflow}>{subItem[key]}</div>
                                </div>
                              );
                            });
                          }
                        })}
                      </div>
                    : _.isObject(item.value) ? 'Object' : item.value}
                  </div>
                  }
                </div>
              </div>
            );
          }
        })}
      </div>
    );
  }
});

var Package = React.createClass({
  getInitialState(){
    return {
      items: []
    };
  },
  componentDidMount(){
    this.formatPackage(this.props);
  },
  componentWillReceiveProps(nP){
    if (!_.isEqual(nP.s.package, this.props.s.package)) {
      this.formatPackage(nP);
    }
  },
  formatPackage(p){
    document.body.scrollIntoView();
    var items = [];
    var removedKeys = ['_inCache', '_phantomChildren', '_shrinkwrap', '_args', '_npmOperationalInternal', 'location', 'name'];

    p.s.package = _.pick(p.s.package, [
      'readme',
      'description',
      'homepage',
      'license',
      'repository',
      'bugs',
      'author',
      '_npmUser',
      'maintainers',
      'main',
      'bin',
      'web',
      'version',
      '_nodeVersion',
      'engines',
      '_npmVersion',
      '_resolved',
      '_shasum',
      '_where',
      'scripts',
      'files',
      'keywords',
      'dependencies',
      'devDependencies',
      'optionalDependencies',
      'data',
      'name'
    ]);

    _.each(p.s.package, (value, key)=>{
      if (removedKeys.indexOf(key) !== -1 || value === {}) {
        return;
      }
      if (key === 'readme' && value === 'ERROR: No README data found!') {
        return;
      }
      if (_.isObject(value) && !_.isArray(value)) {
        value = toArray(value);
      }
      key = space(key);
      var spacedKeys = ['npm', 'node'];
      for (var i = spacedKeys.length - 1; i >= 0; i--) {
        if (key.indexOf(spacedKeys[i]) !== -1) {
          key = `${i === 0 ? spacedKeys[i].toUpperCase() : _.upperFirst(spacedKeys[i])} ${_.upperFirst(key.split(spacedKeys[i])[1])}`;
        }
      }
      items.push({
        key: key,
        value: value !== undefined ? value : ''
      });
    });
    this.setState({items: items});
  },
  render(){
    var p = this.props;
    var s = this.state;
    var descriptionMarkup = ()=> { return {__html: p.s.package.description};};
    if (s.items.length > 0) {
      var startSlice = _.findIndex(s.items, {key: 'dependencies'});
      startSlice = startSlice === -1 || s.items[startSlice].value.length <= 8 ? _.findIndex(s.items, {key: 'devDependencies'}) : startSlice;
      startSlice = startSlice === -1 ? Math.ceil(s.items.length / 2) : startSlice;
      var list1 = s.items.slice(0, startSlice);
      var list2 = s.items.slice(startSlice, s.items.length);
      return (
        <div className="ui grid" style={{paddingLeft: '8px', paddingRight: '8px'}}>
          <div className="two column row">
            <PackageColumn items={list1} descriptionMarkup={descriptionMarkup} width={p.s.width} global={p.s.global} installed={p.s.installed}/>
            <PackageColumn items={list2} descriptionMarkup={descriptionMarkup} width={p.s.width} global={p.s.global} installed={p.s.installed}/>
          </div>
        </div>
      );
    } else {
      return null;
    }
  }
});

var Table = React.createClass({
  getDefaultProps(){
    return {
      data: []
    };
  },
  getInitialState(){
    return {
      columns: [],
      rows: [],
      sortBy: null,
      direction: null,
      rowHover: -1
    };
  },
  componentDidMount(){
    var p = this.props;
    this.formatData(p, true);
  },
  componentWillReceiveProps(nP){
    this.formatData(nP);
  },
  formatData(p, init){
    var s = this.state;
    var columns = [];
    var rows = [];
    
    _.each(p.data, (item, arrKey)=>{
      item.data = item;
      var _item = _.cloneDeep(item);

      var keys = ['name', 'description', 'version', 'license', 'data'];

      if (!s.global) {
        var keys1 = _.slice(keys, 0, 2);
        var keys2 = _.slice(keys, 2, 5);
        keys1 = _.concat(keys1, ['dev']);
        keys = _.concat(keys1, keys2);
      }

      _item = _.pick(_item, keys);

      if (arrKey === 0) {
        columns = _.keys(_item);
      }

      if (_.isObject(_item.license) && _item.license.hasOwnProperty('type')) {
        _item.license = _item.license.type;
      }

      rows.push(_item);
    });
    this.setState({rows: _.orderBy(rows, [s.sortBy], [s.direction]), columns: columns, sortBy: init ? columns[0] : s.sortBy, direction: init ? 'asc' : s.direction});
  },
  render(){
    var s = this.state;
    return (
      <table className="ui celled padded table">
        <thead>
          <tr>
          {s.columns.map((column, c)=>{
            if (column !== 'data') {
              return (
                <th
                key={c}
                style={{maxWidth: column === 'Node Version' ? '300px' : 'initial', cursor: 'default'}}
                onClick={column !== 'View or Edit' ? ()=>this.setState({sortBy: column, direction: s.sortBy === column ? s.direction === 'desc' ? 'asc' : 'desc' : s.direction}) : null}>
                  {_.upperFirst(column)}
                </th>
              );
            }
          })}
          </tr>
        </thead>
        <tbody onMouseLeave={()=>this.setState({rowHover: -1})}>
          {_.orderBy(s.rows, [s.sortBy], [s.direction]).map((row, r)=>{
            return (
              <tr 
              key={r} 
              style={{backgroundColor: s.rowHover === r ? 'rgb(249, 250, 251)' : 'initial'}}
              onClick={()=>state.set({view: 'package', title: row.name, package: row.data})}
              onMouseEnter={()=>this.setState({rowHover: r})}>
                {s.columns.map((column, c)=>{
                  if (column === 'data') {
                    return null;
                  }
                  if (column === 'description') {
                    var createMarkup = ()=> { return {__html: row[column]};};
                    return (
                      <td 
                      key={c}
                      className="top aligned">
                        <div dangerouslySetInnerHTML={createMarkup()} />
                      </td>
                    );
                  } else if (column === 'dev') {
                    return (
                      <td 
                      key={c}
                      className="center aligned">
                        {row[column] ?
                          <i className="large green checkmark icon" /> : null}
                      </td>
                    );
                  } else {
                    return (
                      <td 
                      key={c}
                      style={{width: column === 'name' ? '200px' : column === 'Node Version' ? '125px' : column === 'license' ? '100px' : '75px'}}>{row[column]}</td>
                    );
                  }
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    ); 
  }
});

var Container = React.createClass({
  componentWillReceiveProps(nP){
    if (nP.s.view !== this.props.s.view && nP.s.view === 'search' || nP.s.searchPage !== this.props.s.searchPage) {
      this.handleSearch(nP, this.props);
    }
  },
  handleSearch(p, lastProps){
    if (p.s.search.length === 0) {
      p.onIndexRoute();
      return;
    }

    if (lastProps.s.view === 'package' && lastProps.s.search === p.s.search) {
      state.set({title: `Results for '${p.s.search}'`});
      return;
    }

    var search = p.s.search.indexOf(' ') !== -1 ? p.s.search.split(' ').join('-') : p.s.search;

    var query = _.filter(names, (name)=>{
      return name === search;
    });
    var query2 = _.chain(names).filter((name)=>{
      return kmp(name, search) !== -1;
    }).orderBy((pkg)=>{
      return _.startsWith(pkg, search[0]);
    }).reverse().value();
    if (query.length > 0) {
      _.pull(query2, query[0]);
    }

    query = _.concat(query, query2);
    
    var end = p.s.searchPage * p.s.searchPageSize;
    var start = end - p.s.searchPageSize;

    pkginfo({packages: _.slice(query, start, end)}, (err, data)=>{
      if (err) {
        console.log('ERR: ', err);
      }

      var packages = [];
      _.each(data.data, (pkg, key)=>{
        if (pkg.hasOwnProperty('versions')) {
          pkg.version = _.chain(pkg.versions).keys().last().value();
          _.assignIn(pkg, pkg.versions[pkg.version]);
        }
        packages.push(pkg);
      });
      state.set({pkgs: packages, searchQuery: query, searchPkgs: packages, title: `Results for '${search}'`});
    });
  },
  render(){
    var p = this.props;
    return (
      <div className="parentBody" style={{
        maxHeight: `${p.s.height - 42}px`,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        top: '42px'
      }}>
        <div id="appContainer">
          {p.s.view === 'package' ?
          <Package s={p.s}/>
          :
          <Table data={p.s.pkgs}/>}
        </div>
      </div>
    );
  }
});

var DropdownMenu = onClickOutside(React.createClass({
  handleClickOutside(){
    if (this.props.s.settingsOpen) {
      state.set({settingsOpen: false});
    }
  },
  handleAbout(){
    dialog.showMessageBox({
      type: 'info',
      buttons: [],
      title: 'npmatic',
      message: 'npmatic 0.0.1 ALPHA',
      detail: 'Software written by Jason Hicks and licensed under the MIT License.'

    });
  },
  handleOpenDir(){
    dialog.showOpenDialog({properties: ['openDirectory']}, (cb)=>{
      if (fs.existsSync(`${cb[0]}/package.json`) && fs.existsSync(`${cb[0]}/node_modules`)) { 
        state.set({nmDir: `${cb[0]}/node_modules/`, global: false});
        this.props.onDirOpen();
      } else {
        dialog.showErrorBox('Node Modules Not Found', 'The directory you selected does not contain a package.json file, or a node_modules directory.');
      }
    });
  },
  render(){
    var p = this.props;
    return (
      <div className={`ui dropdown icon item${p.s.settingsOpen ? ' visible' : ''}`} onClick={()=>state.set({settingsOpen: !p.s.settingsOpen})}>
        <i className="wrench icon"></i>
        <div className={`menu transition ${p.s.settingsOpen ? 'visible' : 'hidden'}`}>
          <div className="item" onClick={this.handleOpenDir}>
            Open Directory
          </div>
          <div className="divider"></div>
          <div className="item" onClick={this.handleAbout}>
            About
          </div>
          <div className="divider"></div>
          <div className="item" onClick={()=>window.close()}>
            Quit
          </div>
        </div>
      </div>
    );
  }
}));

var App = React.createClass({
  mixins: [
    Reflux.ListenerMixin,
    ReactUtils.Mixins.WindowSizeWatch
  ],
  getInitialState(){
    return state.get();
  },
  componentDidMount(){
    this.listenTo(state, this.stateChange);
    this.setState({init: false});
    
    // Remove initial splash
    _.defer(()=>{
      $(document.body).css({
        backgroundColor: '#FFF',
        WebkitTransition: '0.2s'
      });
      $('#splash').remove();
    });

    this.getInstalledPackages();
  },
  stateChange(e){
    this.setState(e);
  },
  onWindowResize(){
    this.setState({
      width: window.innerWidth,
      height: window.innerHeight
    });
  },
  cmdExec(command, cb){
    var options = {
      name: 'npmatic',
      //icns: '/Applications/Electron.app/Contents/Resources/Electron.icns', // (optional)
    };
    if (this.state.global) {
      sudo.exec(command, options, function(error, stdout, stderr) {
        cb(error, stdout, stderr);
      });
    } else {
      execa.shell(command).then(result => {
        cb(result);
      });
    }
  },
  getProjectDir(nmDir){
    nmDir = _.filter(nmDir.split('/'), (part)=>{
      return part !== 'node_modules';
    });
    nmDir = nmDir.join('/');
    return nmDir;
  },
  getInstalledPackages(route=true){
    var s = this.state;

    if (s.search.length > 0 && s.view === 'package') {
      state.set({view: 'search'});
      return;
    }

    execa.shell('npm root -g').then(result => {
      console.log('root: ', result.stdout);
      var nmDir = s.nmDir.length > 0 && !s.global ? s.nmDir : `${result.stdout}/`;
      var pkgs = [];
      fs.readdir(nmDir, (err, dir)=>{
        for (let i = 0, len = dir.length; i < len; i++) {
          if (dir[i][0] !== '.') {
            var packageJSON = JSON.parse(fs.readFileSync(`${nmDir}${dir[i]}/package.json`, 'utf8'));
            pkgs.push(packageJSON);
          }
        }
        if (!s.global) {
          var baseDir = this.getProjectDir(nmDir);
          var projectJSON = JSON.parse(fs.readFileSync(`${baseDir}package.json`, 'utf8'));
          var dependencies = [];

          // Pull dependencies from the initial node_modules query
          _.each(projectJSON.dependencies, (dep, key)=>{
            var refDep = _.findIndex(pkgs, {name: key});
            if (refDep !== -1) {
              pkgs[refDep].dev = false;
              dependencies.push(pkgs[refDep]);
            }
          });
          _.each(projectJSON.devDependencies, (dep, key)=>{
            var refDep = _.findIndex(pkgs, {name: key});
            if (refDep !== -1) {
              pkgs[refDep].dev = true;
              dependencies.push(pkgs[refDep]);
            }
          });

        }

        var stateUpdate = {
          pkgs: s.global ? pkgs : dependencies, 
          installed: pkgs
        };
        if (route) {
          _.assignIn(stateUpdate, {
            view: 'index', 
            search: '',
            searchQuery: [],
            searchPkgs: [],
            searchPage: 1,
            title: 'Installed Packages'
          });
        }

        state.set(stateUpdate);
      });
    });
  },
  handleInstall(){
    state.set({installing: true});
    var s = this.state;
    var command = `npm install ${s.global ? '-g' : '--prefix '+this.getProjectDir(s.nmDir)} ${s.package.name}${s.global ? '' : ' --save'}`;

    this.cmdExec(command, (res)=>{
      state.set({installing: false});
      this.getInstalledPackages(!s.global);
    });
  },
  handleUninstall(){
    state.set({installing: true});
    var s = this.state;
    var command = `npm uninstall ${s.global ? '-g' : '--prefix '+this.getProjectDir(s.nmDir)} ${s.package.hasOwnProperty('_from') ? s.package._from.split('@')[0] : s.package.name}${s.global ? '' : ' --save'}`;
    
    this.cmdExec(command, (res)=>{
      state.set({installing: false});
      this.getInstalledPackages();
    });
  },
  triggerSearch(){
    if (this.state.view === 'search') {
      state.set({view: 'none'});
      _.defer(()=>state.set({view: 'search'}));
    } else {
      state.set({view: 'search'});
    }
  },
  handleEnter(e, id){
    if (e.keyCode === 13) {
      this.triggerSearch();
    }
  },
  handleLeft(){
    if (this.state.view === 'search' && this.state.searchPage > 1) {
      state.set({searchPage: this.state.searchPage - 1});
    } else {
      this.getInstalledPackages();
    }
  },
  handleRight(){
    state.set({searchPage: this.state.searchPage + 1});
  },
  render(){
    var s = this.state;
    var isChildView = s.view !== 'index';
    var isInstalled = null;
    var isPaginated = s.view === 'search' && s.searchQuery.length > 20;
    if (s.view === 'package') {
      isInstalled = _.map(s.installed, 'name').indexOf(s.package.name) !== -1;
    }
    return (
      <div>
        <div className="ui top attached menu" style={{
          position: 'absolute',
          maxHeight: '42px',
          zIndex: '99'
        }}>
          <div className="ui dropdown icon item" style={{
            opacity: isChildView ? '1' : '0',
            WebkitTransition: 'opacity 0.2s'
          }} onClick={isChildView ? ()=>this.handleLeft() : null}>
            <i className="chevron left icon"></i>
          </div>
          <div className="ui dropdown icon item" style={{
            opacity: isPaginated ? '1' : '0',
            WebkitTransition: 'opacity 0.2s'
          }} onClick={isPaginated ? ()=>this.handleRight() : null}>
            <i className="chevron right icon"></i>
          </div>
          <h2 style={{
            position: 'absolute',
            left: !isChildView ? '32px' : isPaginated ? '102px' : '62px',
            top: '5px',
            margin: isChildView ? '0px' : 'initial',
            WebkitTransition: 'left 0.2s'
          }}>{s.title}</h2>
          <div className="right menu">
            <a 
            className={s.installing ? 'ui basic loading button' : 'item'} 
            style={{
              cursor: 'default',
              opacity: s.view === 'package' ? '1' : '0',
              WebkitTransition: 'opacity 0.1s',
              margin: s.installing ? '0px' : 'initial',
              boxShadow: s.installing ? '0px 0px 0px 0px' : 'initial'
            }}
            onClick={isInstalled ? ()=>this.handleUninstall() : ()=>this.handleInstall()}>{`${isInstalled ? 'Unin' : 'In'}stall`}</a>
            <div className="item">
              <div className="ui transparent icon input">
                <input type="text" placeholder="Search..." value={s.search} onChange={(e)=>state.set({search: e.target.value})} onKeyDown={this.handleEnter}/>
                <i className="search link icon" style={{cursor: 'default'}} onClick={this.triggerSearch}/>
              </div>
            </div>
            <DropdownMenu s={s} onDirOpen={this.getInstalledPackages} />
          </div>
        </div>
        <Container s={s} onIndexRoute={this.getInstalledPackages}/>
      </div>
    );
  }
});

// Render to the #app element
ReactDOM.render(
  <App />,
  document.getElementById('app')
);