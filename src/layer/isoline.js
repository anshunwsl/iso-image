/**
 * 绘制等值线
 * @author kongkongbuding
 * @since 2019.08.08
 * @param {Object} opt isoimage option
 * @param {Array} lines 线数据
 * @param {Object} config 图片配置 width: 图片宽度, filter 过滤筛选
 */

export default function(config) {

  config = config || {}

  var opt = this.option
  var lines = this.isoline
  var size = opt.size
  var ex = opt.ex
  var text = config.text
  var width = config.width || 1000
  var height = Math.abs((width / size[0]) * size[1])
  var color = config.isolineColor || '#333'
  var filter = config.filter
  var canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  var ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, width, height)
  ctx.lineWidth = 1
  ctx.font = '12px 微软雅黑'
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'center'

  var d = lines.features
  var position = {}

  for (var i = 0, len = d.length; i < len; i++) {

    var val = d[i].properties.val

    if (filter && filter.indexOf && filter.indexOf(val) == -1) continue

    var c = d[i].geometry.coordinates
    var _color = color == 'level' ? d[i].properties.color : color

    ctx.strokeStyle = ctx.fillStyle = _color

    for (var j = 0, jLen = c.length; j < jLen; j++) {

      ctx.beginPath()

      var ft = 0

      for (var n = 0, cLen = c[j].length; n < cLen; n++) {

        var x = ((c[j][n][0] - ex[0][0]) / size[0]) * width
        var y = ((c[j][n][1] - ex[0][1]) / size[1]) * height

        ctx[n ? 'lineTo' : 'moveTo'](x, y)

        var dx = Math.round(x / 16)
        var dy = Math.round(y / 16)
        var k = dx + '-' + dy

        if (text && !position[k] && !ft ) {

          position[k] = 1
          ft = 1

          ctx.fillText(val, x, y)

        }

      }

      ctx.stroke()

    }

  }

  return canvas
  
}
