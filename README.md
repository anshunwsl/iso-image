# iso-image
 * 等值面 等值线 生成
 * 支持渐变
 * 支持反距离平方权重法与克里金插值算法
 * 支持 worker 后台计算

## use

 * [demo1](http://119.3.46.74:8999/iso-image/dist/map.html)        [代碼](./dist/map.html)
 * [demo2](http://119.3.46.74:8999/iso-image/dist/index.html)      [代碼](./dist/index.html)

``` js
      npm install iso-image
      import IsoImage from 'iso-image'
      new IsoImage(data, option[, callBack])

      // or 

      <script src="./iso-image.js"></script>
      new IsoImage(data, option[, callBack])
```

 * option

|参数|类型|说明|
|----|----|----|
|type|Sting|idw(反距离平方权重法)/kriging(克里金插值)|
|pow|Number|idw 加权值|
|model|String|kriging 模型 (gaussian/exponential/spherical)|
|extent|Array|计算区域|
|clip|Array|裁剪边界|
|level|Array|色值等级|
|cellWidth|Number|计算精度 尽量确保总网格数在 2000 - 20000 之间 太大太小都可能出现堆栈溢出 导致失败 (default: 自动计算)|
|keyConfig|Object|data/clip 数据 key 配置|
|worker|String|worker 文件目录|
|smooth|Boolean|平滑|
|webgl|Boolean|是否开启webgl绘制渐变（default: true）|

 * function

|方法|参数|说明|
|----|----|----|
|getIsosurface|fun(option)|获取等值面|
|getIsoline|fun(option)|获取等值线|
|getIsoImage|fun(option)|获取等值面等值线|
|getLegend|fun(option)|获取图例|
|layer|fun(option)|leaflet 绘制图层生成|
|getLeafletIsosurface|fun(layer, option)|leaflet 绘制等值面|
|getLeafletIsoline|fun(layer, option)|leaflet 绘制等值线|
|getLeafletIsoImage|fun(layer, option)|leaflet 绘制等值面等值线|
|getLeafletLegend|fun(layer, option)|leaflet 绘制图例|
|merge|fun(new IsoImage(), option, callBack)|多图合并|

#### worker 使用
 * 开启后台进程执行大量计算部分，防止js堵塞。
 * 下载 `./dist/worker` 文件夹， 参数 worker 路径配置为该文件夹路径。
 * 不支持 ie

#### 效果
![基本](./dist/image/image1.png)
![渐变](./dist/image/image2.png)
![地图](./dist/image/image3.png)
![地图](./dist/image/image4.png)
