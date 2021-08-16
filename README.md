# mini-waveview
# 阅前须知
本片不包含真实音量的波形，是固定分片长度4096，音量40的基础去做的一个音频波形效果。在waveview.js的基础上翻译/重构为了小程序的版本，确切的说为了用这个插件代码变得更复杂了，但是这也是没办法的事。
# 先贴代码
文件名 waveview.js 源自 https://github.com/xiangyuecn/Recorder/blob/master/src/extensions/waveview.js
```
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
```
我将它翻译为了支持小程序的版本，如何使用这个代码呢，请看下面。
## wxml部分
因为微信不支持动态append一个view到视图中(简单查了查这样说，反正代码一定需要改，所以不管它，原则上不合理，未深究)，所以这里我们需要手动定义好一个canvas
```
<View class="wave" id="wave_parent">
  <canvas id="wave" type="2d" class="canvas"></canvas>
</View>
```
## CSS部分
```
.wave{
  position: absolute;
  left: 0;
  top: 0;
  z-index: 9999;
  width: 100vw;
  height: 100px;
  overflow: hidden;
}
.canvas {
  width: 100vw;
  height: 100px;
}
```
## JS部分
### 引入
把最上面的JS代码全部赋值放在一个文件中，放在哪里就从哪里引入就行
```
import { WaveView } from '../../js/waveview';
```
### 初始化
```
initWave() {
    const _this = this;
    const query = this.createSelectorQuery();
    query.select('#wave')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node
        const waveView = new WaveView({
          elem: canvas,
          width:wx.getSystemInfoSync().windowWidth,
          height:100,
          scale: 1
        });
        _this.setData({
          waveView: waveView
        });
      })
  }
```
这个的宽度和高度根据实际情况来决定，可以写的更符合小程序规范一些，其中css和这里的保持一致为最佳实践，目前能说明问题即可。
### 回调
```
  const _this = this;
  this.data.recorderManager.start(this.data.options);
  this.data.recorderManager.onStart(function (){
  });
  this.data.recorderManager.onFrameRecorded(function (res){
    _this.setData({
      recordImage: _this.data.baseRecordImage + (Math.floor(Math.random()*5) + 2) + ".png",
      hiddenImage: false
    });
    if (_this.data.waveView) {
      _this.data.waveView.input();
    }
  });
```
强调一下：目前我无法根据原始PCM切片获取到音量数据，有尝试过类似方式，重新处理的话性能太差直接不考虑，故这里的input全部采用默认值的方式，具体请查看waveview.js的input方法的参数。
