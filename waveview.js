export class WaveView {
  constructor(set) {
    var This = this;
    var o = {
      scale: 2, //缩放系数，应为正整数，使用2(3? no!)倍宽高进行绘制，避免移动端绘制模糊
      speed: 8, //移动速度系数，越大越快
      lineWidth: 3, //线条基础粗细
      //渐变色配置：[位置，css颜色，...] 位置: 取值0.0-1.0之间
      linear1: [0, "rgba(150,96,238,1)", 0.2, "rgba(170,79,249,1)", 1, "rgba(53,199,253,1)"], //线条渐变色1，从左到右
      linear2: [0, "rgba(209,130,255,0.6)", 1, "rgba(53,199,255,0.6)"], //线条渐变色2，从左到右
      linearBg: [0, "rgba(255,255,255,0.2)", 1, "rgba(54,197,252,0.2)"] //背景渐变色，从上到下
    };
    for (var k in set) {
      o[k] = set[k];
    };
    This.set = set = o;
    var scale = set.scale;
    var width = set.width * scale;
    var height = set.height * scale;
    var canvas = set.elem;
    canvas.width = width;
	  canvas.height = height;
    var ctx = This.ctx = canvas.getContext("2d");
    This.linear1 = This.genLinear(ctx, width, set.linear1);
    This.linear2 = This.genLinear(ctx, width, set.linear2);
    This.linearBg = This.genLinear(ctx, height, set.linearBg, true);
    This._phase = 0;
  }
  genLinear(ctx, size, colors, top) {
    var rtv = ctx.createLinearGradient(0, 0, top ? 0 : size, top ? size : 0);
    for (var i = 0; i < colors.length;) {
      rtv.addColorStop(colors[i++], colors[i++]);
    };
    return rtv;
  }
  genPath(frequency, amplitude, phase) {
    //曲线生成算法参考 https://github.com/HaloMartin/MCVoiceWave/blob/f6dc28975fbe0f7fc6cc4dbc2e61b0aa5574e9bc/MCVoiceWave/MCVoiceWaveView.m#L268
    var rtv = [];
    var This = this, set = This.set;
    var scale = set.scale;
    var width = set.width * scale;
    var maxAmplitude = set.height * scale / 2;

    for (var x = 0; x < width; x += scale) {
      var scaling = (1 + Math.cos(Math.PI + (x / width) * 2 * Math.PI)) / 2;
      var y = scaling * maxAmplitude * amplitude * Math.sin(2 * Math.PI * (x / width) * frequency + phase) + maxAmplitude;
      rtv.push(y);
    }
    return rtv;
  }
  input(dataLength = 4096, powerLevel = 40, sampleRate = 16000) {
    var This = this, set = This.set;
    var ctx = This.ctx;
    var scale = set.scale;
    var width = set.width * scale;
    var height = set.height * scale;
    var speedx = set.speed * dataLength / sampleRate;
    var phase = This._phase -= speedx; //位移速度
    var amplitude = powerLevel / 100;
    var path1 = This.genPath(2, amplitude, phase);
    var path2 = This.genPath(1.8, amplitude, phase + speedx * 5);
    //开始绘制图形
    ctx.clearRect(0, 0, width, height);
    //绘制包围背景
    ctx.beginPath();
    for (var i = 0, x = 0; x < width; i++, x += scale) {
      if (x == 0) {
        ctx.moveTo(x, path1[i]);
      } else {
        ctx.lineTo(x, path1[i]);
      };
    };
    i--;
    for (var x = width - 1; x >= 0; i--, x -= scale) {
      ctx.lineTo(x, path2[i]);
    };
    ctx.closePath();
    ctx.fillStyle = This.linearBg;
    ctx.fill();
    //绘制线
    This.drawPath(path2, This.linear2);
    This.drawPath(path1, This.linear1);
  }
  drawPath(path, linear) {
    var This = this, set = This.set;
    var ctx = This.ctx;
    var scale = set.scale;
    var width = set.width * scale;
    ctx.beginPath();
    for (var i = 0, x = 0; x < width; i++, x += scale) {
      if (x == 0) {
        ctx.moveTo(x, path[i]);
      } else {
        ctx.lineTo(x, path[i]);
      };
    };
    ctx.lineWidth = set.lineWidth * scale;
    ctx.strokeStyle = linear;
    ctx.stroke();
  }
}
