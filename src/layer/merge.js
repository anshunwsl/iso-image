/**
 * @author kongkongbuding
 * @since 2019.08.08
 * @param {Array} isoimages isoimage 对象数组
 * @param {Object} opt 配置项
 * @param {Function} callBack 回调
 */

import { isArray } from '../util/common'

export default function(isoimages, opt, callBack) {
  
  var imgs = isArray(isoimages) ? isoimages : []

  var option = Object.assign({}, {

    width: 800,
    height: 600,
    child: []

  }, opt)

  if (!callBack || !imgs.length || !option.child.length) return false

  var c = option.child
  var initInd = 0
  var w = option.width
  var h = option.height
  var canvas = document.createElement('canvas')

  canvas.width = w
  canvas.height = h

  var ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, w, h)

  for (var i = 0, len = c.length; i < len; i++) {

    var t = c[i]
    var v = imgs[t.target]

    if (!v) continue

    initInd++

    v[t.type] && v.initReady(function(that, t) {

      var img = that[t.type](t.config, 1)
      var s = t.scale || 1
      
      initInd--
      
      var pattern = ctx.createPattern(img, 'no-repeat')

      ctx.fillStyle = pattern
      ctx.save()
      ctx.translate(t.x, t.y)
      ctx.scale(s, s)
      ctx.fillRect(0, 0, img.width, img.height)
      ctx.restore()
      
      if ( !initInd ) return callBack(canvas)

    }, t)

  }
  
}
