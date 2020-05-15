/**
 * 查询封闭多边形
 * @param {*} catchLine 等值线
 * @param {*} extent 区域范围
 * @param {*} side 边上的交叉点
 * @param {*} arr 查询出的封闭多边形
 * @param {*} d 当前查询方位
 * @param {*} limit 查询限制 用于方向查询
 * @param {*} nArr 查询分支
 */

import { newSpace, samePoint } from '../util/common'

var search = function(catchLine, extent, side, arr, d, limit, nArr) {

  nArr = nArr || []

  var tp = arr[arr.length - 1]
  var fp
  var fd
  var to
  var coor
  var k = d == 't' || d == 'b' ? 0 : 1
  var q = d == 't' || d == 'l' ? 1 : -1
  var lim = limit ? -1 : 1

  for (var i = 0; side[d][i]; i++) {

    var _tpi = side[d][i]
    var dd = (_tpi.p[k] - tp[k]) * q * lim

    if ( dd > 0 ) {

      if ( !fp || fp && fd > dd ) {

        fp = _tpi
        fd = dd

      }

    }

  }

  if ( !fp ) {

    if ( limit ) {

      switch (d) {

        case 't': arr.push(extent['sa']); to = 'l'; break
        case 'r': arr.push(extent['sb']); to = 't'; break
        case 'b': arr.push(extent['sc']); to = 'r'; break
        case 'l': arr.push(extent['sd']); to = 'b'; break

      }

    } else {

      switch (d) {

        case 't': arr.push(extent['sb']); to = 'r'; break
        case 'r': arr.push(extent['sc']); to = 'b'; break
        case 'b': arr.push(extent['sd']); to = 'l'; break
        case 'l': arr.push(extent['sa']); to = 't'; break

      }

    }

  } else {

    if ( samePoint(fp.p, arr[0]) ) {

      arr.push(fp.p)

    } else {

      coor = newSpace(catchLine[fp.coor].coor)

      fp.d && coor.reverse()
      
      arr = arr.concat(coor)

    }

    to = fp.t

  }

  if ( arr.length > 1 && samePoint(arr[0], arr[arr.length - 1]) ) {

    return [arr].concat(nArr)

  } else {

    if (fp && coor) {

      nArr = search(catchLine, extent, side, coor, to, !limit, nArr)
      
    }

    return search(catchLine, extent, side, arr, to, limit, nArr)

  }

}

export default search
