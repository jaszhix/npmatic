var exec = require('child_process').exec;
export var formatBytes = (bytes, decimals)=>{
  if (bytes === 0) {
    return '0 Byte';
  }
  var k = 1000;
  var dm = decimals + 1 || 3;
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toPrecision(dm) + ' ' + sizes[i];
};

export var msToTime = (s)=>{
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  var output = `${hrs}h ${mins}m ${secs}s`;
  output = hrs <= 0 ? output.split('h ')[1] : output;
  output = mins <= 0 ? output.split('m ')[1] : output;
  return output;
};

export var exc = (cmd)=>{
  return new Promise((resolve, reject)=>{
    exec(cmd, function (err, stdout, stderr) {
      if (err) {
        reject(err);
      } else {
        resolve(stdout.trim());
      }
    });
  });
};