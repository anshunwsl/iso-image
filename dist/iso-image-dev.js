(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = global || self, global.IsoImage = factory());
}(this, function () { 'use strict';

  if ( !Object.assign ) {

    Object.assign = function(target) {

      var source = [];

      for (var _i = 1; _i < arguments.length; _i++) {

        source[_i - 1] = arguments[_i];

      }

      var from,
        to = Object(target),
        hasOwnProperty = Object.prototype.hasOwnProperty;

      for (var i = 0, l = source.length; i < l; i++) {

        from = Object(source[i]);

        for (var key in from) {

          if ( hasOwnProperty.call(from, key) ) {

            to[key] = from[key];

          }

        }

      }

      return to

    };

  }

  var max = Math.max;
  var min = Math.min;
  var abs = Math.abs;
  var floor = Math.floor;

  function ToObject(v) {

    if ( v === null || v === undefined ) {

      throw TypeError()

    }

    return Object(v)

  }

  function ToLength(v) {

    var len = ToInteger(v);

    if (len <= 0) {

      return 0

    }

    if (len === Infinity) {

      return 0x20000000000000 - 1 // 2^53-1

    }

    return min(len, 0x20000000000000 - 1) // 2^53-1

  }

  function ToInteger(n) {

    n = Number(n);

    if ( isNaN(n) ) {

      return 0

    }

    if ( n === 0 || n === Infinity || n === -Infinity ) {

      return n

    }
    
    return (n < 0 ? -1 : 1) * floor(abs(n))

  }

  Array.prototype.max = function() {

    return Math.max.apply(null, this)

  };

  Array.prototype.min = function() {

    return Math.min.apply(null, this)

  };

  Array.prototype.mean = function() {

    var i, sum;

    for (i = 0, sum = 0; i < this.length; i++) {

      sum += this[i];

    }

    return sum / this.length

  };

  Array.prototype.fill = function fill(value) {

    var start = arguments[1],
      end = arguments[2];

    var o = ToObject(this);
    var lenVal = o.length;
    var len = ToLength(lenVal);

    len = max(len, 0);

    var relativeStart = ToInteger(start);
    var k;

    if (relativeStart < 0) {

      k = max(len + relativeStart, 0);

    } else {

      k = min(relativeStart, len);

    }

    var relativeEnd;

    if (end === undefined) {

      relativeEnd = len;

    } else {

      relativeEnd = ToInteger(end);

    }

    var final;

    if (relativeEnd < 0) {
      
      final = max(len + relativeEnd, 0);

    } else {

      final = min(relativeEnd, len);
      
    }

    while (k < final) {

      var pk = String(k);

      o[pk] = value;
      k += 1;

    }

    return o

  };

  Array.prototype.rep = function(n) {

    return Array.apply(null, new Array(n)).map(Number.prototype.valueOf, this[0])

  };

  Array.prototype.pip = function(x, y) {

    var i,
      j,
      c = false;

    for (i = 0, j = this.length - 1; i < this.length; j = i++) {

      if (
        this[i][1] > y != this[j][1] > y &&
        x <
          ((this[j][0] - this[i][0]) * (y - this[i][1])) /
            (this[j][1] - this[i][1]) +
            this[i][0]
      ) {
        c = !c;
      }

    }

    return c
    
  };

  /**
   * 反距离平方权重法
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} points 数据点
   * @param {Object} pointGrid 网格点
   * @param {Number} pow 权重系数
   */

  function idw(points, pointGrid, pow) {

    if (pow == void 0) {

      pow = 3;

    }

    var features = pointGrid.features;

    if (points.length < 3) {

      return pointGrid

    }

    var m0 = points.length;
    var m1 = features.length;
    var r = [];

    for (var i = 0; i < m1; i++) {

      for (var j = 0; j < m0; j++) {

        var tmpDis = Math.sqrt(

          Math.pow(features[i].geometry.coordinates[0] - points[j].x, 2) +
          Math.pow(features[i].geometry.coordinates[1] - points[j].y, 2)

        );

        r.push(tmpDis);

      }

    }

    for (var i = 0; i < m1; i++) {

      var ifFind = false;

      for (var j = m0 * i; j < m0 * i + m0; j++) {

        if ( Math.abs(r[j]) < 0.0001 ) {

          features[i].properties.val = points[j - m0 * i].v;
          ifFind = true;

          break

        }

      }

      if ( ifFind ) {

        continue

      }

      var numerator = 0;
      var denominator = 0;

      for (var j = m0 * i; j < m0 * i + m0; j++) {

        numerator += points[j - m0 * i].v / Math.pow(r[j], pow);
        denominator += 1 / Math.pow(r[j], pow);

      }

      features[i].properties.val = numerator / denominator;

    }

    return pointGrid
    
  }

  /**
   * 克里金插值
   */
  var kriging = (function() {
    var kriging = {};

    var kriging_matrix_diag = function(c, n) {
      var i,
        Z = new Array(n * n).fill(0);
      for (i = 0; i < n; i++) Z[i * n + i] = c;
      return Z
    };
    var kriging_matrix_transpose = function(X, n, m) {
      var i,
        j,
        Z = Array(m * n);
      for (i = 0; i < n; i++) for (j = 0; j < m; j++) Z[j * n + i] = X[i * m + j];
      return Z
    };
    var kriging_matrix_add = function(X, Y, n, m) {
      var i,
        j,
        Z = Array(n * m);
      for (i = 0; i < n; i++)
        for (j = 0; j < m; j++) Z[i * m + j] = X[i * m + j] + Y[i * m + j];
      return Z
    };
    var kriging_matrix_multiply = function(X, Y, n, m, p) {
      var i,
        j,
        k,
        Z = Array(n * p);
      for (i = 0; i < n; i++) {
        for (j = 0; j < p; j++) {
          Z[i * p + j] = 0;
          for (k = 0; k < m; k++) Z[i * p + j] += X[i * m + k] * Y[k * p + j];
        }
      }
      return Z
    };
    var kriging_matrix_chol = function(X, n) {
      var i,
        j,
        k,
        p = Array(n);
      for (i = 0; i < n; i++) p[i] = X[i * n + i];
      for (i = 0; i < n; i++) {
        for (j = 0; j < i; j++) p[i] -= X[i * n + j] * X[i * n + j];
        if (p[i] <= 0) return false
        p[i] = Math.sqrt(p[i]);
        for (j = i + 1; j < n; j++) {
          for (k = 0; k < i; k++) X[j * n + i] -= X[j * n + k] * X[i * n + k];
          X[j * n + i] /= p[i];
        }
      }
      for (i = 0; i < n; i++) X[i * n + i] = p[i];
      return true
    };
    var kriging_matrix_chol2inv = function(X, n) {
      var i, j, k, sum;
      for (i = 0; i < n; i++) {
        X[i * n + i] = 1 / X[i * n + i];
        for (j = i + 1; j < n; j++) {
          sum = 0;
          for (k = i; k < j; k++) sum -= X[j * n + k] * X[k * n + i];
          X[j * n + i] = sum / X[j * n + j];
        }
      }
      for (i = 0; i < n; i++) for (j = i + 1; j < n; j++) X[i * n + j] = 0;
      for (i = 0; i < n; i++) {
        X[i * n + i] *= X[i * n + i];
        for (k = i + 1; k < n; k++) X[i * n + i] += X[k * n + i] * X[k * n + i];
        for (j = i + 1; j < n; j++)
          for (k = j; k < n; k++) X[i * n + j] += X[k * n + i] * X[k * n + j];
      }
      for (i = 0; i < n; i++) for (j = 0; j < i; j++) X[i * n + j] = X[j * n + i];
    };
    var kriging_matrix_solve = function(X, n) {
      var m = n;
      var b = Array(n * n);
      var indxc = Array(n);
      var indxr = Array(n);
      var ipiv = Array(n);
      var i, icol, irow, j, k, l, ll;
      var big, dum, pivinv, temp;

      for (i = 0; i < n; i++)
        for (j = 0; j < n; j++) {
          if (i == j) b[i * n + j] = 1;
          else b[i * n + j] = 0;
        }
      for (j = 0; j < n; j++) ipiv[j] = 0;
      for (i = 0; i < n; i++) {
        big = 0;
        for (j = 0; j < n; j++) {
          if (ipiv[j] != 1) {
            for (k = 0; k < n; k++) {
              if (ipiv[k] == 0) {
                if (Math.abs(X[j * n + k]) >= big) {
                  big = Math.abs(X[j * n + k]);
                  irow = j;
                  icol = k;
                }
              }
            }
          }
        }
        ++ipiv[icol];

        if (irow != icol) {
          for (l = 0; l < n; l++) {
            temp = X[irow * n + l];
            X[irow * n + l] = X[icol * n + l];
            X[icol * n + l] = temp;
          }
          for (l = 0; l < m; l++) {
            temp = b[irow * n + l];
            b[irow * n + l] = b[icol * n + l];
            b[icol * n + l] = temp;
          }
        }
        indxr[i] = irow;
        indxc[i] = icol;

        if (X[icol * n + icol] == 0) return false

        pivinv = 1 / X[icol * n + icol];
        X[icol * n + icol] = 1;
        for (l = 0; l < n; l++) X[icol * n + l] *= pivinv;
        for (l = 0; l < m; l++) b[icol * n + l] *= pivinv;

        for (ll = 0; ll < n; ll++) {
          if (ll != icol) {
            dum = X[ll * n + icol];
            X[ll * n + icol] = 0;
            for (l = 0; l < n; l++) X[ll * n + l] -= X[icol * n + l] * dum;
            for (l = 0; l < m; l++) b[ll * n + l] -= b[icol * n + l] * dum;
          }
        }
      }
      for (l = n - 1; l >= 0; l--)
        if (indxr[l] != indxc[l]) {
          for (k = 0; k < n; k++) {
            temp = X[k * n + indxr[l]];
            X[k * n + indxr[l]] = X[k * n + indxc[l]];
            X[k * n + indxc[l]] = temp;
          }
        }

      return true
    };
    var kriging_variogram_gaussian = function(h, nugget, range, sill, A) {
      return (
        nugget +
        ((sill - nugget) / range) *
          (1.0 - Math.exp(-(1.0 / A) * Math.pow(h / range, 2)))
      )
    };
    var kriging_variogram_exponential = function(h, nugget, range, sill, A) {
      return (
        nugget +
        ((sill - nugget) / range) * (1.0 - Math.exp(-(1.0 / A) * (h / range)))
      )
    };
    var kriging_variogram_spherical = function(h, nugget, range, sill, A) {
      if (h > range) return nugget + (sill - nugget) / range
      return (
        nugget +
        ((sill - nugget) / range) *
          (1.5 * (h / range) - 0.5 * Math.pow(h / range, 3))
      )
    };

    kriging.train = function(t, x, y, model, sigma2, alpha) {
      var variogram = {
        t: t,
        x: x,
        y: y,
        nugget: 0.0,
        range: 0.0,
        sill: 0.0,
        A: 1 / 3,
        n: 0
      };
      switch (model) {
        case 'gaussian':
          variogram.model = kriging_variogram_gaussian;
          break
        case 'exponential':
          variogram.model = kriging_variogram_exponential;
          break
        case 'spherical':
          variogram.model = kriging_variogram_spherical;
          break
      }

      var i,
        j,
        k,
        l,
        n = t.length;
      var distance = Array((n * n - n) / 2);
      for (i = 0, k = 0; i < n; i++)
        for (j = 0; j < i; j++, k++) {
          distance[k] = Array(2);
          distance[k][0] = Math.pow(
            Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2),
            0.5
          );
          distance[k][1] = Math.abs(t[i] - t[j]);
        }
      distance.sort(function(a, b) {
        return a[0] - b[0]
      });
      variogram.range = distance[(n * n - n) / 2 - 1][0];

      var lags = (n * n - n) / 2 > 30 ? 30 : (n * n - n) / 2;
      var tolerance = variogram.range / lags;

      var lag = new Array(lags).fill(0);
      var semi = new Array(lags).fill(0);

      if (lags < 30) {
        for (l = 0; l < lags; l++) {
          lag[l] = distance[l][0];
          semi[l] = distance[l][1];
        }
      } else {
        for (
          i = 0, j = 0, k = 0, l = 0;
          i < lags && j < (n * n - n) / 2;
          i++, k = 0
        ) {
          while (distance[j][0] <= (i + 1) * tolerance) {
            lag[l] += distance[j][0];
            semi[l] += distance[j][1];
            j++;
            k++;
            if (j >= (n * n - n) / 2) break
          }
          if (k > 0) {
            lag[l] /= k;
            semi[l] /= k;
            l++;
          }
        }
        if (l < 2) return variogram
      }

      n = l;
      variogram.range = lag[n - 1] - lag[0];

      var X = new Array(2 * n).fill(1);
      var Y = Array(n);
      var A = variogram.A;
      for (i = 0; i < n; i++) {
        switch (model) {
          case 'gaussian':
            X[i * 2 + 1] =
              1.0 - Math.exp(-(1.0 / A) * Math.pow(lag[i] / variogram.range, 2));
            break
          case 'exponential':
            X[i * 2 + 1] = 1.0 - Math.exp((-(1.0 / A) * lag[i]) / variogram.range);
            break
          case 'spherical':
            X[i * 2 + 1] =
              1.5 * (lag[i] / variogram.range) -
              0.5 * Math.pow(lag[i] / variogram.range, 3);
            break
        }
        Y[i] = semi[i];
      }

      var Xt = kriging_matrix_transpose(X, n, 2);
      var Z = kriging_matrix_multiply(Xt, X, 2, n, 2);
      Z = kriging_matrix_add(Z, kriging_matrix_diag(1 / alpha, 2), 2, 2);
      var cloneZ = Z.slice(0);
      if (kriging_matrix_chol(Z, 2)) kriging_matrix_chol2inv(Z, 2);
      else {
        kriging_matrix_solve(cloneZ, 2);
        Z = cloneZ;
      }
      var W = kriging_matrix_multiply(
        kriging_matrix_multiply(Z, Xt, 2, 2, n),
        Y,
        2,
        n,
        1
      );

      variogram.nugget = W[0];
      variogram.sill = W[1] * variogram.range + variogram.nugget;
      variogram.n = x.length;

      n = x.length;
      var K = Array(n * n);
      for (i = 0; i < n; i++) {
        for (j = 0; j < i; j++) {
          K[i * n + j] = variogram.model(
            Math.pow(Math.pow(x[i] - x[j], 2) + Math.pow(y[i] - y[j], 2), 0.5),
            variogram.nugget,
            variogram.range,
            variogram.sill,
            variogram.A
          );
          K[j * n + i] = K[i * n + j];
        }
        K[i * n + i] = variogram.model(
          0,
          variogram.nugget,
          variogram.range,
          variogram.sill,
          variogram.A
        );
      }

      var C = kriging_matrix_add(K, kriging_matrix_diag(sigma2, n), n, n);
      var cloneC = C.slice(0);
      if (kriging_matrix_chol(C, n)) kriging_matrix_chol2inv(C, n);
      else {
        kriging_matrix_solve(cloneC, n);
        C = cloneC;
      }

      var K = C.slice(0);
      var M = kriging_matrix_multiply(C, t, n, n, 1);
      variogram.K = K;
      variogram.M = M;

      return variogram
    };
    kriging.predict = function(x, y, variogram) {
      var i,
        k = Array(variogram.n);
      for (i = 0; i < variogram.n; i++)
        k[i] = variogram.model(
          Math.pow(
            Math.pow(x - variogram.x[i], 2) + Math.pow(y - variogram.y[i], 2),
            0.5
          ),
          variogram.nugget,
          variogram.range,
          variogram.sill,
          variogram.A
        );
      return kriging_matrix_multiply(k, variogram.M, 1, variogram.n, 1)[0]
    };
    return kriging
  })();

  /**
   * 点在面内
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} point 点
   * @param {Array} polygon 面
   */

  var hitArea = function(point, polygon){   

    var x = point[0], y = point[1];
    var inside = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {  

        var xi = polygon[i][0], yi = polygon[i][1];  
        var xj = polygon[j][0], yj = polygon[j][1];
        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);

        if (intersect) {

          inside = !inside;
          
        }

    }  

    return inside

  };

  var O = Object.prototype.toString;

  var isArray = function(v) {
    
    return O.call(v) === '[object Array]'
    
  };

  var isObject = function(v) {
    
    return O.call(v) === '[object Object]'
    
  };

  var newSpace = function(d, f) {

    if (f) return JSON.parse(JSON.stringify(d))

    if (isArray(d)) {

      if (d.length == 0 || (d.length > 0 && !isArray(d[0]) && !isObject(d[0])))
        return Object.assign([], d, [])

      var vd = [];

      for (var i = 0, len = d.length; i < len; i++) {

        vd.push(newSpace(d[i]));

      }

      return vd

    }

    if (isObject(d)) {

      var nd = new Object();

      for (var p in d) nd[p] = newSpace(d[p]);

      return nd

    }

    return d

  };

  var samePoint = function(a, b) {

    return a[0] == b[0] && a[1] == b[1]

  };

  var dist = function (a, b) {

    return Math.abs(a - b)

  };

  var signFigures = function(num, dec) {

    dec = dec == void 0 ? 1 : dec;

    var toExponential = (+num).toExponential(dec);
    var max = Number(toExponential);

    return max

  };

  var getExtent = function(features) {

    var minx;
    var miny;
    var maxx;
    var maxy;

    for (var i = 0, iLen = features.length; i < iLen; i++) {

      var coors = features[i].geometry.coordinates;

      for (var j = 0, jLen = coors.length; j < jLen; j++) {

        var cLen = coors[j].length;

        if (!cLen) continue

        if (minx == void 0) {

          minx = maxx = coors[j][0][0];
          miny = maxy = coors[j][0][1];

        }

        minx = Math.min(minx, coors[j][0][0], coors[j][cLen - 1][0]);
        miny = Math.min(miny, coors[j][0][1], coors[j][cLen - 1][1]);
        maxx = Math.max(maxx, coors[j][0][0], coors[j][cLen - 1][0]);
        maxy = Math.max(maxy, coors[j][0][1], coors[j][cLen - 1][1]);

      }

    }

    return [
      minx,
      miny,
      maxx,
      maxy
    ]

  };

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

  var search = function(catchLine, extent, side, arr, d, limit, nArr) {

    nArr = nArr || [];

    var tp = arr[arr.length - 1];
    var fp;
    var fd;
    var to;
    var coor;
    var k = d == 't' || d == 'b' ? 0 : 1;
    var q = d == 't' || d == 'l' ? 1 : -1;
    var lim = limit ? -1 : 1;

    for (var i = 0; side[d][i]; i++) {

      var _tpi = side[d][i];
      var dd = (_tpi.p[k] - tp[k]) * q * lim;

      if ( dd > 0 ) {

        if ( !fp || fp && fd > dd ) {

          fp = _tpi;
          fd = dd;

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

        arr.push(fp.p);

      } else {

        coor = newSpace(catchLine[fp.coor].coor);

        fp.d && coor.reverse();
        
        arr = arr.concat(coor);

      }

      to = fp.t;

    }

    if ( arr.length > 1 && samePoint(arr[0], arr[arr.length - 1]) ) {

      return [arr].concat(nArr)

    } else {

      if (fp && coor) {

        nArr = search(catchLine, extent, side, coor, to, !limit, nArr);
        
      }

      return search(catchLine, extent, side, arr, to, limit, nArr)

    }

  };

  /**
   * 获取色值
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} arr 颜色等级
   * @param {Number} v 值
   * @param {Boolean} gradient 是否渐变
   */

  var getColor = function(arr, v, gradient) {

    var color = false;

    for (var i = 0, len = arr.length; i < len; i++) {

      if ( v < arr[i].value ) {

        if ( !color ) {

          color = JSON.parse(JSON.stringify(arr[i]));

          break

        }

        var scale = (v - color.value) / (arr[i].value - color.value);
        var f = function(k) {

          return gradient
            ? color[k] + (arr[i][k] - color[k]) * scale
            : arr[i][k]

        };

        color.r = f('r');
        color.g = f('g');
        color.b = f('b');
        color.a = f('a');

        break

      } else {

        color = JSON.parse(JSON.stringify(arr[i]));

      }

    }

    return color
    
  };

  /**
   * 区块计算
   * @author kongkongbuding
   * @since 2019.08.08
   */

  var abs$1 = Math.abs;
  var max$1 = Math.max;
  var min$1 = Math.min;
  var floor$1 = Math.floor;

  var calcDir = function (p, ex) {

    var t = -1;
    var dir = Infinity;
    var min = [
      Math.abs(ex[0] - ex[2]) / 10,
      Math.abs(ex[1] - ex[3]) / 10
    ];

    for (var i = 0; i < 4; i++) {

      var iDir = dist(ex[i], p[i % 2]);

      if ( iDir < min[i % 2] && iDir < dir ) {

        dir = iDir;
        t = i;

      }

    }

    if (t < 0) return false

    var dt = 'lbrt'.charAt(t);

    return dt
    
  };

  var offsetPoints = function(lines) {

    for (let p in lines) {

      let line = lines[p];

      for (let i = 0, len = line.length; i < len; i++) {

        let v = line[i];

        if (v.t != p) continue

        let index = p == 't' || p == 'b' ? 0 : 1;

        for (let j = 0; j < len; j++) {

          let u = line[j];

          if (v.coor == u.coor || v.d != u.d) continue

          if (v.p[index] == u.p[index]) v.p[index] += (u.end[index] - v.end[index]) * 0.1;
          if (v.end[index] == u.end[index]) v.end[index] += (u.p[index] - v.p[index]) * 0.1;

        }

      }

    }

    return lines

  };

  /**
   * 
   * @param {Object} lines 等值线
   * @param {Array} extent [min-lat-左, min-lng-下, max-lat-右, max-lng-上]
   * @param {*} pointGrid 网格数据
   * @param {Array} level 颜色级别
   */

  function calcBlock(lines, extent, pointGrid, level) {

    var close = [];
    var open = [];
    var catchLine = [];
    var side = {
      t: [],
      b: [],
      l: [],
      r: []
    };
    var features = lines.features;

    for (var i = 0, il = features.length; i < il; i++) {

      var f = features[i];
      var c = f.geometry.coordinates;

      for (var n = 0, nl = c.length; n < nl; n++) {
        
        var l = c[n];
        var first = l[0];
        var last = l[l.length - 1];

        // 闭环
        if ( samePoint(first, last) ) {

          close.push( {

            coor: l,
            properties: f.properties,
            child: [],
            parent: [],
            i: close.length

          } );

        }

        // 开环
        else {

          catchLine.push( {

            coor: l,
            properties: f.properties

          } );

          var fd = calcDir(first, extent);
          var ld = calcDir(last, extent);
          
          if (!fd || !ld) continue

          side[fd].push( {

            p: first,
            end: last,
            d: 0,
            t: ld,
            coor: catchLine.length - 1

          } );

          side[ld].push( {

            p: last,
            end: first,
            d: 1,
            t: fd,
            coor: catchLine.length - 1

          } );

        }

      }

    }

    var searchExtent = {

      sa: [extent[0], extent[3]],
      sb: [extent[2], extent[3]],
      sc: [extent[2], extent[1]],
      sd: [extent[0], extent[1]]

    };

    side = offsetPoints(side);

    open = search(catchLine, searchExtent, side, [searchExtent['sa']], 't', false);

    for (var i = 0, len = open.length; i < len; i++) {

      close.push( {

        coor: open[i],
        properties: {

          type: 'open'
          
        },
        child: [],
        parent: [],
        i: close.length

      } );

    }

    // 父子关系
    for (var i = 0, il = close.length; i < il; i++) {

      for (var j = i + 1; j < il; j++) {

        var iT = close[i].properties.type;
        var jT = close[j].properties.type;

        if ( iT != 'open' && hitArea(close[i].coor[0], close[j].coor) ) {

          close[j].child.push(i);
          close[i].parent.push(j);

        } else if ( jT != 'open' && hitArea(close[j].coor[0], close[i].coor) ) {

          close[i].child.push(j);
          close[j].parent.push(i);

        }

      }

    }
    
    // 生成区块
    var remain = newSpace(close);
    var buildItem = [];
    var buildIndx = [];
    var PIndex = [];
    var orderTree = function () {

      if ( !remain.length ) {

        return false

      }

      var _remain = [];

      for (var i = 0, il = remain.length; i < il; i++) {

        var r = remain[i];
        var child = r.child;
        var iT = 1;

        for (var jl = child.length,  j = jl - 1; j > -1; j --) {

          if (buildIndx.indexOf(child[j]) == -1) {

            iT = 0;

          }

        }

        if ( iT ) {

          var nC = [];

          for (var jl = child.length,  j = jl - 1; j > -1; j --) {

            var ind = PIndex.indexOf(child[j]);

            if ( ind > -1 ) {

              nC.push(child[j]);
              PIndex.splice(ind, 1);

            }

          }

          PIndex.push(r.i);
          buildIndx.push(r.i);
          remain[i].child = nC;
          buildItem.push(remain[i]);

          continue

        }

        _remain.push(remain[i]);

      }

      if ( !_remain.length ) {
        
        return false

      }

      remain = _remain;

      orderTree();

    };

    orderTree();
    
    var buildFeatures = [];
    var pg = pointGrid.features;
    var pl = pg.length;
    var ft = pg[0].geometry.coordinates;
    var row = 1;
    var cw = 1;
    var ch = 1;

    for (var i = 0; i < pl; i++) {

      var tt = pg[i].geometry.coordinates;

      if ( i == 1 ) {

        ch = abs$1(tt[1] - ft[1]);

      }

      if ( tt[0] != ft[0] ) {

        row = i;
        cw = abs$1(tt[0] - ft[0]);

        break

      }

    }

    for (var i = 0, il = buildItem.length; i < il; i++) {

      var c = buildItem[i];
      var coordinates = [c.coor];
      var color = 'rgba(0, 0, 0, 0)';

      for (var j = 0, jl = c.child.length; j < jl; j++) {

        coordinates.push(close[c.child[j]].coor);

      }

      var ci = floor$1(c.coor.length / 2);
      var cp = c.coor[ci];
      var _col = (cp[0] - ft[0]) / cw;
      var gi = max$1(floor$1(_col) * row + floor$1((cp[1] - ft[1]) / ch), 0);
      var target = _col % 1 ? 0 : 1;
      var di = target ? 1 : row;
      var _dx = target ? ch : cw;
      var dx = _dx / 100;
      var val;

      if ( pg[gi] && pg[gi + di] ) {

        var np = pg[gi].geometry.coordinates;
        var nep = pg[gi + di].geometry.coordinates;
        var _cp = Object.assign([], cp, []);

        _cp[target] = max$1(cp[target] - dx, np[target]);

        var va = pg[gi].properties.val;
        var vb = pg[gi + di].properties.val;

        if ( !hitArea(_cp, c.coor) ) {

          _cp[target] = min$1(cp[target] + dx * 2, nep[target]);

        }

        if ( hitArea(_cp, c.coor) ) {

          val = va + (vb - va) * (abs$1(_cp[target] - pg[gi].geometry.coordinates[target]) / _dx);

        }

      } else if ( pg[gi] ) {

        val = pg[gi].properties.val;

      }

      if ( val != void 0 ) {

        var _color = getColor(level, val, false);

        color = 'rgba(' + _color.r + ',' + _color.g + ',' + _color.b + ',' + _color.a + ')';
        val = _color.value;

      }

      buildFeatures.push( {

        geometry: {

          coordinates: coordinates,
          type: 'MultiLineString'

        },
        properties: {

          val: val,
          color: color

        },
        type: 'Feature'

      } );

    }

    return {

      features: buildFeatures,
      type: "FeatureCollection"

    }
    
  }

  var Vector3 = function(a, b, c) {

    this.x = a || 0;
    this.y = b || 0;
    this.z = c || 0;

  };

  Vector3.prototype = {
    constructor: Vector3,
    add: function(a) {

      this.x += a.x;
      this.y += a.y;
      this.z += a.z;

      return this

    },
    subVectors: function(a, b) {

      this.x = a.x - b.x;
      this.y = a.y - b.y;
      this.z = a.z - b.z;

      return this

    },
    distanceToSquared: function(a) {

      var b = this.x - a.x;
      var c = this.y - a.y;
      var a = this.z - a.z;

      return b * b + c * c + a * a

    }
  };

  var CatmullRomCurve3 = (function() {

    var Curve = function() {};

    Curve.prototype = {
      getPoint: function() {

        console.log("Warning, getPoint() not implemented!");

        return null

      },
      getPointAt: function(a) {

        a = this.getUtoTmapping(a);

        return this.getPoint(a)

      },
      getPoints: function(a) {

        a || (a = 5);
        var b;
        var c = [];

        for (b = 0; b <= a; b++) {

          c.push(this.getPoint(b / a));

        }

        return c

      },
      getSpacedPoints: function (a) {

        a || (a = 5);

        var b;
        var c = [];

        for (b = 0; b <= a; b++) {
          
          c.push(this.getPointAt(b / a));

        }

        return c

      },
      getLength: function() {

        var a = this.getLengths();

        return a[a.length - 1]

      },
      getLengths: function(a) {

        a || (a = this.__arcLengthDivisions ? this.__arcLengthDivisions : 200);

        if ( this.cacheArcLengths && this.cacheArcLengths.length == a + 1 && !this.needsUpdate ) {

          return this.cacheArcLengths

        }

        this.needsUpdate = !1;

        var b = [];
        var c;
        var d = this.getPoint(0);
        var e;
        var f = 0;

        b.push(0);

        for (e = 1; e <= a; e++) {

          c = this.getPoint(e / a);
          f += c.distanceTo(d), b.push(f);
          d = c;

        }

        return this.cacheArcLengths = b

      },
      updateArcLengths: function() {

        this.needsUpdate = !0;

        this.getLengths();

      },
      getUtoTmapping: function (a, b) {

        var c = this.getLengths();
        var d = 0;
        var e = c.length;
        var f;

        f = b ? b : a * c[e - 1];

        for (var h = 0, g = e - 1, i; h <= g;) {

          if ( d = Math.floor(h + (g - h) / 2), i = c[d] - f, 0 > i ) {

            h = d + 1;

          } else if ( 0 < i ) {
            
            g = d - 1;

          } else {
            
            g = d;

            break

          }

        }

        d = g;

        if ( c[d] == f ) {

          return d / (e - 1)

        }

        h = c[d];

        return c = (d + (f - h) / (c[d + 1] - h)) / (e - 1)

      },
      getTangent: function(a) {

        var b = a - 1E-4;
        var a = a + 1E-4;

        0 > b && (b = 0);
        1 < a && (a = 1);

        b = this.getPoint(b);

        return this.getPoint(a).clone().sub(b).normalize()

      },
      getTangentAt: function(a) {

        a = this.getUtoTmapping(a);

        return this.getTangent(a)

      }
    };

    Curve.Utils = {
      tangentQuadraticBezier: function(a, b, c, d) {

        return 2 * (1 - a) * (c - b) + 2 * a * (d - c)

      },
      tangentCubicBezier: function(a, b, c, d, e) {

        return -3 * b * (1 - a) * (1 - a) + 3 * c * (1 - a) * (1 - a) - 6 * a * c * (1 - a) + 6 * a * d * (1 - a) - 3 * a * a * d + 3 * a * a * e

      },
      tangentSpline: function(a) {

        return 6 * a * a - 6 * a + (3 * a * a - 4 * a + 1) + (-6 * a * a + 6 * a) + (3 * a * a - 2 * a)

      },
      interpolate: function(a, b, c, d, e) {

        var a = 0.5 * (c - a);
        var d = 0.5 * (d - b);
        var f = e * e;

        return (2 * b - 2 * c + a + d) * e * f + (-3 * b + 3 * c - 2 * a - d) * f + a * e + b

      }
    };

    Curve.create = function(a, b) {

      a.prototype = Object.create(Curve.prototype);
      a.prototype.getPoint = b;

      return a

    };

    var CubicPoly = function() {};

    CubicPoly.prototype = {
      init: function(x0, x1, t0, t1) {

        this.c0 = x0;
        this.c1 = t0;
        this.c2 = -3 * x0 + 3 * x1 - 2 * t0 - t1;
        this.c3 = 2 * x0 - 2 * x1 + t0 + t1;
    
      },
      initNonuniformCatmullRom: function(x0, x1, x2, x3, dt0, dt1, dt2) {

        var t1 = (x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1;
        var t2 = (x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2;

        t1 *= dt1;
        t2 *= dt1;

        this.init(x1, x2, t1, t2);
    
      },
      initCatmullRom: function(x0, x1, x2, x3, tension) {

        this.init(x1, x2, tension * (x2 - x0), tension * (x3 - x1));
    
      },
      calc: function (t) {

        var t2 = t * t;
        var t3 = t2 * t;

        return this.c0 + this.c1 * t + this.c2 * t2 + this.c3 * t3
    
      }
    };

    var tmp = new Vector3();
    var px = new CubicPoly();
    var py = new CubicPoly();
    var pz = new CubicPoly();

    return Curve.create(

      function (p) {

        this.points = p || [];
        this.closed = false;

      },

      function (t) {

        var points = this.points;
        var point;
        var intPoint;
        var weight;
        var l = points.length;

        if (l < 2) {
          
          console.log('duh, you need at least 2 points');

        }

        point = (l - (this.closed ? 0 : 1)) * t;
        intPoint = Math.floor(point);
        weight = point - intPoint;

        if ( this.closed ) {

          intPoint += intPoint > 0 ? 0 : (Math.floor(Math.abs(intPoint) / points.length) + 1) * points.length;

        } else if ( weight === 0 && intPoint === l - 1 ) {

          intPoint = l - 2;
          weight = 1;

        }

        var p0;
        var p1;
        var p2;
        var p3;

        if ( this.closed || intPoint > 0 ) {

          p0 = points[(intPoint - 1) % l];

        } else {

          tmp.subVectors(points[0], points[1]).add(points[0]);
          p0 = tmp;

        }

        p1 = points[intPoint % l];
        p2 = points[(intPoint + 1) % l];

        if ( this.closed || intPoint + 2 < l ) {

          p3 = points[(intPoint + 2) % l];

        } else {

          tmp.subVectors(points[l - 1], points[l - 2]).add(points[l - 1]);
          p3 = tmp;

        }

        if ( this.type === undefined || this.type === 'centripetal' || this.type === 'chordal' ) {

          var pow = this.type === 'chordal' ? 0.5 : 0.25;
          var dt0 = Math.pow(p0.distanceToSquared(p1), pow);
          var dt1 = Math.pow(p1.distanceToSquared(p2), pow);
          var dt2 = Math.pow(p2.distanceToSquared(p3), pow);

          if (dt1 < 1e-4) {

            dt1 = 1.0;

          }

          if (dt0 < 1e-4) {

            dt0 = dt1;
            
          }

          if (dt2 < 1e-4) {

            dt2 = dt1;

          }

          px.initNonuniformCatmullRom(p0.x, p1.x, p2.x, p3.x, dt0, dt1, dt2);
          py.initNonuniformCatmullRom(p0.y, p1.y, p2.y, p3.y, dt0, dt1, dt2);
          pz.initNonuniformCatmullRom(p0.z, p1.z, p2.z, p3.z, dt0, dt1, dt2);

        } else if ( this.type === 'catmullrom' ) {

          var tension = this.tension !== undefined ? this.tension : 0.5;

          px.initCatmullRom(p0.x, p1.x, p2.x, p3.x, tension);
          py.initCatmullRom(p0.y, p1.y, p2.y, p3.y, tension);
          pz.initCatmullRom(p0.z, p1.z, p2.z, p3.z, tension);

        }

        var v = new Vector3(
          px.calc(weight),
          py.calc(weight),
          pz.calc(weight)
        );

        return v

      }

    )

  })();

  var Spline = function(vec, NumPoints) {

    var ver = new Array();

    for ( var i = 0; i < vec.length; i++ ) {

      ver[i] = new Vector3(vec[i][0], vec[i][1], 0);

    }

    var curve = new CatmullRomCurve3(ver);
    var spline = curve.getPoints(NumPoints * ver.length);
    var splinePoints = new Array();

    for (var i = 0; i < spline.length; i++) {
      
      splinePoints.push([spline[i].x, spline[i].y]);

    }

    return splinePoints
    
  };

  /**
   * 绘制图例
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} level 等级数组
   * @param {Object} config
   */

  var defaultConfig = {

    direction: 'vertical', // vertical horizontal
    backgroundColor: '#fff',
    color: '#333',
    gradient: true

  };

  function getLegend(level, config) {

    if ( level.legend < 2 ) {

      return false

    }

    config = Object.assign({}, defaultConfig, config);

    var gradient = config.gradient ? 1 : 0;
    var dir = config.direction == 'horizontal' ? 0 : 1;
    var title = config.title || '';
    var shape = config.shape || 'rect';
    var legend = document.createElement('canvas');
    var w = dir ? 120 : 340;

    if ( !gradient ) {

      w += 20;

    }

    var h = dir ? 240 : 50;

    legend.width = w;
    legend.height = h;

    var gR = dir ? [15, 30, 20, 200] : [70, 5, 200, 20];
    var lG = dir ? [gR[0], gR[1] + gR[3], gR[0], gR[1]] : [gR[0], gR[1], gR[0] + gR[2], gR[1]];
    var ctx = legend.getContext('2d');

    ctx.lineWidth = 1;
    ctx.strokeStyle = '#999';
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '12px 微软雅黑';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'start';
    ctx.fillStyle = config.color;

    var grad = ctx.createLinearGradient(lG[0], lG[1], lG[2], lG[3]);

    for (var i = 0, len = level.length; i < len; i++) {

      var color = level[i].color;
      var unit = level[i].unit || '';
      var text = level[i].value + unit;
      var ps = (1 / (len - 1)) * i; 

      if ( !gradient && i > 0 && i < len - 1 ) {

        var _color = level[i - 1].color;

        grad.addColorStop(ps, _color);
        grad.addColorStop(ps, color);

      } else {

        grad.addColorStop(ps, color);

      }

      if ( dir ) {

        ctx.fillText(text, gR[0] + gR[2] + 5, gR[1] + gR[3] * (1 - ps));

      } else if ( !i || i == len - 1 ) {

        var tw = ctx.measureText(text).width;
        var y = gR[1] + gR[3] / 2;
        var x = i ? gR[0] + gR[2] + 5 : gR[0] - 5 - tw;

        ctx.fillText(text, x, y);

      }

    }
    
    ctx.fillStyle = grad;

    switch (shape) {

      case 'triangle-rect':

        if ( dir ) {

          var td = gR[2] / 2;

          ctx.beginPath();
          ctx.moveTo(gR[0] + td, gR[1]);
          ctx.lineTo(gR[0] + gR[2], gR[1] + td);
          ctx.lineTo(gR[0] + gR[2], gR[1] + gR[3] - td);
          ctx.lineTo(gR[0] + td, gR[1] + gR[3]);
          ctx.lineTo(gR[0], gR[1] + gR[3] - td);
          ctx.lineTo(gR[0], gR[1] + td);
          ctx.lineTo(gR[0] + td, gR[1]);
          ctx.stroke();
          ctx.fill();

        } else {

          var td = gR[3] / 2;

          ctx.beginPath();
          ctx.moveTo(gR[0], gR[1] + td);
          ctx.lineTo(gR[0] + td, gR[1]);
          ctx.lineTo(gR[0] + gR[2] - td, gR[1]);
          ctx.lineTo(gR[0] + gR[2], gR[1] + td);
          ctx.lineTo(gR[0] + gR[2] - td, gR[1] + gR[3]);
          ctx.lineTo(gR[0] + td, gR[1] + gR[3]);
          ctx.lineTo(gR[0], gR[1] + td);
          ctx.stroke();
          ctx.fill();

        }

        break

      default: 

        ctx.fillRect(gR[0], gR[1], gR[2], gR[3]);

        break

    }

    if ( title.length ) {

      ctx.font = '14px 微软雅黑';
      ctx.fillStyle = config.color;
      ctx.textBaseline = 'top';

      if ( dir ) {

        ctx.textAlign = 'start';
        ctx.fillText(title, 5, 5);

      } else {

        ctx.textAlign = 'center';
        ctx.fillText(title, w / 2, gR[1] + gR[3] + 5);

      }

    }

    return legend
    
  }

  /**
   * 绘制等值线
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Object} opt isoimage option
   * @param {Array} lines 线数据
   * @param {Object} config 图片配置 width: 图片宽度, filter 过滤筛选
   */

  function getIsoline(opt, lines, config) {

    config = config || {};

    var size = opt.size;
    var ex = opt.ex;
    var width = config.width || 1000;
    var height = Math.abs((width / size[0]) * size[1]);
    var color = config.isolineColor || '#333';
    var filter = config.filter;
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.font = '12px 微软雅黑';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    var d = lines.features;
    var position = {};

    for (var i = 0, len = d.length; i < len; i++) {

      var val = d[i].properties.val;

      if (filter && filter.indexOf && filter.indexOf(val) == -1) {

        continue

      }

      var c = d[i].geometry.coordinates;
      var _color = color == 'level' ? d[i].properties.color : color;

      ctx.strokeStyle = ctx.fillStyle = _color;

      for (var j = 0, jLen = c.length; j < jLen; j++) {

        ctx.beginPath();

        var ft = 0;

        for (var n = 0, cLen = c[j].length; n < cLen; n++) {

          var x = ((c[j][n][0] - ex[0][0]) / size[0]) * width;
          var y = ((c[j][n][1] - ex[0][1]) / size[1]) * height;

          ctx[n ? 'lineTo' : 'moveTo'](x, y);

          var dx = Math.round(x / 16);
          var dy = Math.round(y / 16);
          var k = dx + '-' + dy;

          if ( !position[k] && !ft ) {

            position[k] = 1;
            ft = 1;

            ctx.fillText(val, x, y);

          }

        }

        ctx.stroke();

      }

    }

    return canvas
    
  }

  /**
   * 绘制等值面
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Object} opt isoimage option
   * @param {Object} pointGrid 网格
   * @param {Object} isosurface
   * @param {Object} config 图片配置 width: 图片宽度 opacity: 透明度 gradient 是否渐变, filter 过滤筛选 
   */

  function isosurfaceNormal(opt, pointGrid, isosurface, config) {

    config = config || {};

    var gradient = config.gradient == void 0 ? true : config.gradient;
    var size = opt.size;
    var cellWidth = opt.cellWidth;
    var level = opt.level;
    var ex = opt.ex;
    var filter = config.filter;
    var width = config.width || 1000;
    var height = Math.abs((width / size[0]) * size[1]);
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);

    if ( gradient ) {

      console.log(1);

      var p = pointGrid.features;
      var cellx = size[0] / cellWidth > 1 ? p[Math.abs(Math.ceil(size[1] / cellWidth)) + 1].geometry.coordinates[0] - p[0].geometry.coordinates[0] : cellWidth;
      var celly = size[1] / cellWidth > 1 ? p[1].geometry.coordinates[1] - p[0].geometry.coordinates[1] : cellWidth;
      var w = Math.abs((cellx / size[0]) * width);
      var h = Math.abs((celly / size[1]) * height);

      for (var i = 0, len = p.length; i < len; i++) {

        var item = p[i].geometry.coordinates;
        var x = ((item[0] - ex[0][0]) / size[0]) * width - w / 2;
        var y = ((item[1] - ex[0][1]) / size[1]) * height - h / 2;
        var color = getColor(level, p[i].properties.val, gradient);
        var val = color.value;

        if (filter && filter.indexOf && filter.indexOf(val) == -1) {

          continue

        }
        
        console.log(color);

        ctx.strokeStyle = ctx.fillStyle =
          'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + color.a + ')';
        ctx.beginPath();
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);

      }

    } else {

      var d = isosurface.features;

      for (var i = 0, len = d.length; i < len; i++) {

        var val = d[i].properties.val;

        if (filter && filter.indexOf && filter.indexOf(val) == -1) {

          continue

        }

        var c = d[i].geometry.coordinates;

        ctx.strokeStyle = ctx.fillStyle = d[i].properties.color;

        ctx.beginPath();

        for (var j = 0, jLen = c.length; j < jLen; j++) {

          for (var n = 0, cLen = c[j].length; n < cLen; n++) {

            var x = ((c[j][n][0] - ex[0][0]) / size[0]) * width;
            var y = ((c[j][n][1] - ex[0][1]) / size[1]) * height;

            ctx[n ? 'lineTo' : 'moveTo'](x, y);

          }

        }

        ctx.fill('evenodd');

      }

    }
    
    return canvas
    
  }

  /**
   * 绘制等值面
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Object} opt isoimage option
   * @param {Object} pointGrid 网格
   * @param {Object} isosurface
   * @param {Object} config 图片配置 width: 图片宽度 opacity: 透明度 gradient 是否渐变, filter 过滤筛选 
   */

  function getIsosurface(opt, pointGrid, isosurface, config) {

    config = config || {};

    var gradient = config.gradient == void 0 ? true : config.gradient;
    var size = opt.size;
    var cellWidth = opt.cellWidth;
    var level = opt.level;
    var ex = opt.ex;
    var filter = config.filter;
    var width = config.width || 1000;
    var height = Math.abs((width / size[0]) * size[1]);
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    return isosurfaceNormal.apply(this, arguments)
    
  }

  /**
   * 绘制等值面
   * @author kongkongbuding
   * @since 2020.05.15
   */

  var createShader = function(gl, sourceCode, type) {

    var shader = gl.createShader(type);

    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {

      var info = gl.getShaderInfoLog(shader);

      throw new Error('着色器程序构建失败！ \n\n' + info)

    }

    return shader

  };

  var createShaderProgram = function(gl, VSHADER_SOURCE, FSHADER_SOURCE) {

    var vertShader = createShader(gl, VSHADER_SOURCE, gl.VERTEX_SHADER);
    var fragShader = createShader(gl, FSHADER_SOURCE, gl.FRAGMENT_SHADER);
    
    var shaderProgram = gl.createProgram();

    gl.attachShader(shaderProgram, vertShader);
    gl.attachShader(shaderProgram, fragShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);

    return shaderProgram

  };

  var createVertexBuffer = function(gl, data) {

    var buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    var float32Data = new Float32Array(data);

    gl.bufferData(gl.ARRAY_BUFFER, float32Data, gl.STATIC_DRAW);

    return buffer

  };

  function IsosurfaceWebgl(extent, grid, level) {

    var canvas = document.createElement('canvas');
    var gl = canvas.getContext('webgl');

    if (!gl) {

      console.log('未发现 webgl !');

      return false

    }

    this.canvas = canvas;
    this.gl = gl;
    
    this.extent = extent;
    this.grid = grid;
    this.level = level;

    this.setup(gl);

  }

  IsosurfaceWebgl.prototype = {
    /** */
    state: null,
    /** */
    canvas: null,
    /** */
    gl: null,
    /** */
    extent: [0, 0, 1, 1],
    /** */
    grid: null,
    /** */
    level: null,
    /** */
    program: null,
    /** */
    indices: [],
    /** */
    a_Position: null,
    a_Color: null,
    a_indices: null,
    /** */
    u_Scale: null,
    u_Offset: null,
    /** */
    constructor: IsosurfaceWebgl,
    /** */
    setup: function(gl) {
      
      this.initShaders(gl);

      this.initData(gl);

    },
    /** */
    initShaders: function(gl) {

      var VSHADER_SOURCE =
        `
        attribute vec2 a_Position;
        attribute vec4 a_Color;

        uniform float u_Scale;
        attribute vec2 u_Offset;
        
        varying vec4 aColor;

        void main() {
          
          aColor = a_Color;

          gl_Position = vec4((a_Position + u_Offset) * u_Scale, 0.0, 1.0);

        }
      `;

      var FSHADER_SOURCE =
        `
        precision highp float;

        varying vec4 aColor;

        void main() {

          gl_FragColor = aColor;

        }
      `;

      this.program = createShaderProgram(gl, VSHADER_SOURCE, FSHADER_SOURCE);

      this.u_Scale = gl.getUniformLocation(this.program, 'u_Scale');
      this.u_Offset = gl.getUniformLocation(this.program, 'u_Offset');

    },
    /** */
    initData: function(gl) {

      var extent = this.extent;
      var grid = this.grid;
      var level = this.level;
      var col = 1;
      var row = 1;
      var features = grid.features;
      var len = features.length;
      var lng = features[0].geometry.coordinates[0];
      var size = [extent[1][0] - extent[0][0], extent[1][1] - extent[0][1]];
      
      for (var i = 1; i < len; i++) {

        if (features[i].geometry.coordinates[0] != lng) break
        
        col++;

      }

      row = parseInt(len / col);

      var num = (col - 1) * (row - 1) * 2;

      var vertices = new Float32Array(len * 2);
      var colors = new Float32Array(len * 4);
      var indices = new Uint16Array(num * 3);

      for (var i = 0; i < len; i++) {

        var coordinates = features[i].geometry.coordinates;
        var val = features[i].properties.val;
        var color = getColor(level, val, 1);

        vertices.set([
          ((coordinates[0] - extent[0][0]) / size[0]) * 2 - 1,
          ((coordinates[1] - extent[0][1]) / size[1]) * 2 - 1
        ], i * 2);

        colors.set([
          color.r / 255,
          color.g / 255,
          color.b / 255,
          color.a
        ], i * 3);

      }

      for (var i = 0; i < col - 1; i++) {

        for (var j = 9; j < row - 1; j++) {

          var ij = (i * (row - 1) + j) * 6;
          var a = i * col + j;
          var b = a + col;
          var c = a + 1;
          var d = b + 1;

          indices.set([
            a, c, d,
            a, d, b
          ], ij);

        }

      }
      
      this.a_Position = createVertexBuffer(gl, vertices);
      this.a_Color = createVertexBuffer(gl, colors);

      var indicesBufferObject = gl.createBuffer();

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBufferObject );
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

      this.indices = indices;
      this.a_indices = indicesBufferObject;

    },
    render: function() {
      
      console.log(this.gl);
      var gl = this.gl;

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.a_indices );
      gl.drawElements(gl.TRIANGLES, this.indices.length, gl.UNSIGNED_SHORT, 0);

      return this.canvas

    }
  };

  /**
   * 图片叠加 透明度处理
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} cavs canvas数组
   * @param {Object} config {opacity: 透明度}
   */

  function mix(cavs, option, config) {

    if (!cavs[0]) {

      return false

    }

    config = config || {};

    var opacity = config.opacity || 1;
    var width = cavs[0].width;
    var height = cavs[0].height;
    var canvas = document.createElement('canvas');

    canvas.width = width;
    canvas.height = height;

    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, width, height);
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = config.clipColor || '#333';
    ctx.lineWidth = config.clipWidth || 1;

    var clip = option.clip;

    if ( clip && isArray(clip) ) {
      
      var ex = option.ex;
      var size = option.size;
      var key = option.key || {};
      var x = key.clipX || 0;
      var y = key.clipY || 1;

      ctx.beginPath();

      var drawClip = function(d) {

        if ( isArray(d[0]) && isArray(d[0][0]) ) {

          for (var i = 0, len = d.length; i < len; i++) {

            drawClip(d[i]);

          }

          return false

        }

        if ( isArray(d) ) {

          for (var i = 0, len = d.length; i < len; i++) {

            var dx = ((d[i][x] - ex[0][0]) / size[0]) * width;
            var dy = ((d[i][y] - ex[0][1]) / size[1]) * height;

            ctx[i ? 'lineTo' : 'moveTo'](dx, dy);

          }

        }

      };

      drawClip(clip);

      config.clip && ctx.stroke();

      ctx.clip();

    }

    for (var i = 0; cavs[i]; i++) {

      var pattern = ctx.createPattern(cavs[i], 'no-repeat');

      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, width, height);

    }
    
    return canvas
    
  }

  /**
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {Array} isoimages isoimage 对象数组
   * @param {Object} opt 配置项
   * @param {Function} callBack 回调
   */

  function merge(isoimages, opt, callBack) {
    
    var imgs = isArray(isoimages) ? isoimages : [];

    var option = Object.assign({}, {

      width: 800,
      height: 600,
      child: []

    }, opt);

    if (!callBack || !imgs.length || !option.child.length) {

      return false

    }

    var c = option.child;
    var initInd = 0;
    var w = option.width;
    var h = option.height;
    var canvas = document.createElement('canvas');

    canvas.width = w;
    canvas.height = h;

    var ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, w, h);

    for (var i = 0, len = c.length; i < len; i++) {

      var t = c[i];
      var v = imgs[t.target];

      if (!v) {

        continue

      }

      initInd++;

      v[t.type] && v.initReady(function(that, t) {

        var img = that[t.type](t.config, 1);
        var s = t.scale || 1;
        
        initInd--;
        
        var pattern = ctx.createPattern(img, 'no-repeat');

        ctx.fillStyle = pattern;
        ctx.save();
        ctx.translate(t.x, t.y);
        ctx.scale(s, s);
        ctx.fillRect(0, 0, img.width, img.height);
        ctx.restore();
        
        if ( !initInd ) {

          return callBack(canvas)
          
        }

      }, t);

    }
    
  }

  var fmtLatLng = function(latlngs, deep, x, y) {

    if ( y === void 0 ) {
      
      y = 1;

    }

    if ( x === void 0 ) {

      x = 0;

    }

    if ( !deep ) {

      return [latlngs[y], latlngs[x]]


    } 

    deep--;

    for (var i = 0, len = latlngs.length; i < len; i++) {

      latlngs[i] = fmtLatLng(latlngs[i], deep);

    }

    return latlngs

  };

  var fmtGeoJson = function(data) {

    var d = newSpace(data);

    for (var i = 0, len = d.features.length; i < len; i++) {

      var coor = d.features[i].geometry.coordinates;
      
      d.features[i].geometry.coordinates = fmtLatLng(coor, 2);

    }

    return d

  };

  /**
   * leaflet 失量叠加图层
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {*} config 
   */
  var IsoLayer = function(config) {

    if ( !L.IsoImageCanvasLayer ) {

      L.IsoImageCanvasLayer = L.Canvas.extend({

        _initContainer: function () {

          var container = this._container = document.createElement('canvas');

          this._container.style.opacity = 0;

          L.DomEvent.on(container, 'mousemove', L.Util.throttle(this._onMouseMove, 32, this), this);
          L.DomEvent.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);
          L.DomEvent.on(container, 'mouseout', this._handleMouseOut, this);

          this._ctx = container.getContext('2d');

        },

        _draw: function () {

          var layer, bounds = this._redrawBounds;
          var _ctx = this._ctx;

          _ctx.save();

          if ( bounds ) {

            var size = bounds.getSize();

            _ctx.beginPath();
            _ctx.rect(bounds.min.x, bounds.min.y, size.x, size.y);
            _ctx.clip();

          }
      
          this._drawing = true;
      
          for (var order = this._drawFirst; order; order = order.next) {

            layer = order.layer;

            if ( !bounds || (layer._pxBounds && layer._pxBounds.intersects(bounds)) ) {

              layer._updatePath();

            }

          }
      
          this._drawing = false;
      
          _ctx.restore();
          
          this.options.clipLayer && this.options.clipLayer._clip(_ctx);

        }

      });

    }

    return new L.IsoImageCanvasLayer(config)

  };

  var ClipLayer = function(config) {

    if ( !L.ClipCanvasLayer ) {

      L.ClipCanvasLayer = L.Canvas.extend({

        _initContainer: function () {

          var container = this._container = document.createElement('canvas');
      
          L.DomEvent.on(container, 'mousemove', L.Util.throttle(this._onMouseMove, 32, this), this);
          L.DomEvent.on(container, 'click dblclick mousedown mouseup contextmenu', this._onClick, this);
          L.DomEvent.on(container, 'mouseout', this._handleMouseOut, this);
      
          this._ctx = container.getContext('2d');

        },
        _clip: function (ctx) {

          var _ctx = this._ctx;
          _ctx.fillStyle = _ctx.createPattern(ctx.canvas, 'no-repeat');

          // var size = this._bounds.getSize()

          // console.log(this._bounds.min.x, this._bounds.min.y, size.x, size.y)
          // _ctx.fillRect(this._bounds.min.x, this._bounds.min.y, size.x, size.y)

          _ctx.beginPath();

          for (var order = this._drawFirst; order; order = order.next) {

            var layer = order.layer;
            var parts = layer._parts;

            for (var i = 0, len = parts.length; i < len; i++) {

              for (var j = 0, jLen = parts[i].length; j < jLen; j++) {

                _ctx[j ? 'lineTo' : 'moveTo'](parts[i][j].x, parts[i][j].y);

              }

            }

          }
          
          _ctx.save();
          _ctx.translate(this._bounds.min.x, this._bounds.min.y);
          _ctx.fill();
          _ctx.restore();

        }
        
      });

    }

    return new L.ClipCanvasLayer(config)
    
  };

  /**
   * leaflet 图例
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {*} config 
   */
  function leafletLegend(config) {

    if ( !L.Control.IsoLegendCortrol ) {

      L.Control.IsoLegendCortrol = L.Control.extend({

        options: {

          position: 'bottomleft',
          canvas: ''

        },

        initialize: function(options) {

          L.Util.extend(this.options, options);

        },
        
        onAdd: function() {

          this._container = L.DomUtil.create('div', 'leaflet-control-iso-legend');
          this._container.appendChild(this.options.canvas);

          return this._container

        }

      });

    }

    return new L.Control.IsoLegendCortrol(config)

  }

  /**
   * leaflet 图片叠加
   * @author kongkongbuding
   * @since 2019.08.08 
   */

  function leafletImage(d, type, layer, config) {

    if (!d || !layer) {

      return false

    }

    var group = [];
    var filter = config.filter;

    for (var i = 0; d.features[i]; i++) {

      var v = d.features[i];
      var val = v.properties.val;

      if (filter && filter.indexOf && filter.indexOf(val) == -1 || !v.geometry.coordinates.length) {

        continue

      }

      var style = Object.assign({}, {

        stroke: true,
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0.7,
        color: v.properties.color,
        fillColor: v.properties.color,
        renderer: layer,
        smoothFactor: 0.5
        
      }, config);

      var marker = L[type](v.geometry.coordinates, style);

      group.push(marker);

    }

    return group

  }

  /**
   * 格式化等级
   * @author kongkongbuding
   * @since 2019.08.08
   * @param {*} level 
   */

  var fmtLevel = function(level) {

    for (var i = 0, len = level.length; i < len; i++) {

      var color = level[i].color;

      level[i].r = parseInt(color.substr(1, 2), 16);
      level[i].g = parseInt(color.substr(3, 2), 16);
      level[i].b = parseInt(color.substr(5, 2), 16);
      level[i].a = parseInt(color.substr(7, 2) || 'ff', 16) / 255;

    }

    return level
    
  };

  /**
   * Earth Radius used with the Harvesine formula and approximates using a spherical (non-ellipsoid) Earth.
   */
  var earthRadius = 6371008.8;

  /**
   * Unit of measurement factors using a spherical (non-ellipsoid) earth radius.
   */
  var factors = {
      meters: earthRadius,
      metres: earthRadius,
      millimeters: earthRadius * 1000,
      millimetres: earthRadius * 1000,
      centimeters: earthRadius * 100,
      centimetres: earthRadius * 100,
      kilometers: earthRadius / 1000,
      kilometres: earthRadius / 1000,
      miles: earthRadius / 1609.344,
      nauticalmiles: earthRadius / 1852,
      inches: earthRadius * 39.370,
      yards: earthRadius / 1.0936,
      feet: earthRadius * 3.28084,
      radians: 1,
      degrees: earthRadius / 111325,
  };

  /**
   * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
   *
   * @name feature
   * @param {Geometry} geometry input geometry
   * @param {Object} [properties={}] an Object of key-value pairs to add as properties
   * @param {Object} [options={}] Optional Parameters
   * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
   * @param {string|number} [options.id] Identifier associated with the Feature
   * @returns {Feature} a GeoJSON Feature
   * @example
   * var geometry = {
   *   "type": "Point",
   *   "coordinates": [110, 50]
   * };
   *
   * var feature = turf.feature(geometry);
   *
   * //=feature
   */
  function feature(geometry, properties, options) {
      // Optional Parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var bbox = options.bbox;
      var id = options.id;

      // Validation
      if (geometry === undefined) throw new Error('geometry is required');
      if (properties && properties.constructor !== Object) throw new Error('properties must be an Object');
      if (bbox) validateBBox(bbox);
      if (id) validateId(id);

      // Main
      var feat = {type: 'Feature'};
      if (id) feat.id = id;
      if (bbox) feat.bbox = bbox;
      feat.properties = properties || {};
      feat.geometry = geometry;
      return feat;
  }

  /**
   * Creates a {@link Point} {@link Feature} from a Position.
   *
   * @name point
   * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
   * @param {Object} [properties={}] an Object of key-value pairs to add as properties
   * @param {Object} [options={}] Optional Parameters
   * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
   * @param {string|number} [options.id] Identifier associated with the Feature
   * @returns {Feature<Point>} a Point feature
   * @example
   * var point = turf.point([-75.343, 39.984]);
   *
   * //=point
   */
  function point(coordinates, properties, options) {
      if (!coordinates) throw new Error('coordinates is required');
      if (!Array.isArray(coordinates)) throw new Error('coordinates must be an Array');
      if (coordinates.length < 2) throw new Error('coordinates must be at least 2 numbers long');
      if (!isNumber(coordinates[0]) || !isNumber(coordinates[1])) throw new Error('coordinates must contain numbers');

      return feature({
          type: 'Point',
          coordinates: coordinates
      }, properties, options);
  }

  /**
   * Creates a {@link LineString} {@link Feature} from an Array of Positions.
   *
   * @name lineString
   * @param {Array<Array<number>>} coordinates an array of Positions
   * @param {Object} [properties={}] an Object of key-value pairs to add as properties
   * @param {Object} [options={}] Optional Parameters
   * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
   * @param {string|number} [options.id] Identifier associated with the Feature
   * @returns {Feature<LineString>} LineString Feature
   * @example
   * var linestring1 = turf.lineString([[-24, 63], [-23, 60], [-25, 65], [-20, 69]], {name: 'line 1'});
   * var linestring2 = turf.lineString([[-14, 43], [-13, 40], [-15, 45], [-10, 49]], {name: 'line 2'});
   *
   * //=linestring1
   * //=linestring2
   */
  function lineString(coordinates, properties, options) {
      if (!coordinates) throw new Error('coordinates is required');
      if (coordinates.length < 2) throw new Error('coordinates must be an array of two or more positions');
      // Check if first point of LineString contains two numbers
      if (!isNumber(coordinates[0][1]) || !isNumber(coordinates[0][1])) throw new Error('coordinates must contain numbers');

      return feature({
          type: 'LineString',
          coordinates: coordinates
      }, properties, options);
  }

  /**
   * Takes one or more {@link Feature|Features} and creates a {@link FeatureCollection}.
   *
   * @name featureCollection
   * @param {Feature[]} features input features
   * @param {Object} [options={}] Optional Parameters
   * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
   * @param {string|number} [options.id] Identifier associated with the Feature
   * @returns {FeatureCollection} FeatureCollection of Features
   * @example
   * var locationA = turf.point([-75.343, 39.984], {name: 'Location A'});
   * var locationB = turf.point([-75.833, 39.284], {name: 'Location B'});
   * var locationC = turf.point([-75.534, 39.123], {name: 'Location C'});
   *
   * var collection = turf.featureCollection([
   *   locationA,
   *   locationB,
   *   locationC
   * ]);
   *
   * //=collection
   */
  function featureCollection(features, options) {
      // Optional Parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var bbox = options.bbox;
      var id = options.id;

      // Validation
      if (!features) throw new Error('No features passed');
      if (!Array.isArray(features)) throw new Error('features must be an Array');
      if (bbox) validateBBox(bbox);
      if (id) validateId(id);

      // Main
      var fc = {type: 'FeatureCollection'};
      if (id) fc.id = id;
      if (bbox) fc.bbox = bbox;
      fc.features = features;
      return fc;
  }

  /**
   * Creates a {@link Feature<MultiLineString>} based on a
   * coordinate array. Properties can be added optionally.
   *
   * @name multiLineString
   * @param {Array<Array<Array<number>>>} coordinates an array of LineStrings
   * @param {Object} [properties={}] an Object of key-value pairs to add as properties
   * @param {Object} [options={}] Optional Parameters
   * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
   * @param {string|number} [options.id] Identifier associated with the Feature
   * @returns {Feature<MultiLineString>} a MultiLineString feature
   * @throws {Error} if no coordinates are passed
   * @example
   * var multiLine = turf.multiLineString([[[0,0],[10,10]]]);
   *
   * //=multiLine
   */
  function multiLineString(coordinates, properties, options) {
      if (!coordinates) throw new Error('coordinates is required');

      return feature({
          type: 'MultiLineString',
          coordinates: coordinates
      }, properties, options);
  }

  /**
   * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
   * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
   *
   * @name radiansToLength
   * @param {number} radians in radians across the sphere
   * @param {string} [units='kilometers'] can be degrees, radians, miles, or kilometers inches, yards, metres, meters, kilometres, kilometers.
   * @returns {number} distance
   */
  function radiansToLength(radians, units) {
      if (radians === undefined || radians === null) throw new Error('radians is required');

      if (units && typeof units !== 'string') throw new Error('units must be a string');
      var factor = factors[units || 'kilometers'];
      if (!factor) throw new Error(units + ' units is invalid');
      return radians * factor;
  }

  /**
   * Converts an angle in degrees to radians
   *
   * @name degreesToRadians
   * @param {number} degrees angle between 0 and 360 degrees
   * @returns {number} angle in radians
   */
  function degreesToRadians(degrees) {
      if (degrees === null || degrees === undefined) throw new Error('degrees is required');

      var radians = degrees % 360;
      return radians * Math.PI / 180;
  }

  /**
   * isNumber
   *
   * @param {*} num Number to validate
   * @returns {boolean} true/false
   * @example
   * turf.isNumber(123)
   * //=true
   * turf.isNumber('foo')
   * //=false
   */
  function isNumber(num) {
      return !isNaN(num) && num !== null && !Array.isArray(num);
  }

  /**
   * isObject
   *
   * @param {*} input variable to validate
   * @returns {boolean} true/false
   * @example
   * turf.isObject({elevation: 10})
   * //=true
   * turf.isObject('foo')
   * //=false
   */
  function isObject$1(input) {
      return (!!input) && (input.constructor === Object);
  }

  /**
   * Validate BBox
   *
   * @private
   * @param {Array<number>} bbox BBox to validate
   * @returns {void}
   * @throws Error if BBox is not valid
   * @example
   * validateBBox([-180, -40, 110, 50])
   * //=OK
   * validateBBox([-180, -40])
   * //=Error
   * validateBBox('Foo')
   * //=Error
   * validateBBox(5)
   * //=Error
   * validateBBox(null)
   * //=Error
   * validateBBox(undefined)
   * //=Error
   */
  function validateBBox(bbox) {
      if (!bbox) throw new Error('bbox is required');
      if (!Array.isArray(bbox)) throw new Error('bbox must be an Array');
      if (bbox.length !== 4 && bbox.length !== 6) throw new Error('bbox must be an Array of 4 or 6 numbers');
      bbox.forEach(function (num) {
          if (!isNumber(num)) throw new Error('bbox must only contain numbers');
      });
  }

  /**
   * Validate Id
   *
   * @private
   * @param {string|number} id Id to validate
   * @returns {void}
   * @throws Error if Id is not valid
   * @example
   * validateId([-180, -40, 110, 50])
   * //=Error
   * validateId([-180, -40])
   * //=Error
   * validateId('Foo')
   * //=OK
   * validateId(5)
   * //=OK
   * validateId(null)
   * //=Error
   * validateId(undefined)
   * //=Error
   */
  function validateId(id) {
      if (!id) throw new Error('id is required');
      if (['string', 'number'].indexOf(typeof id) === -1) throw new Error('id must be a number or a string');
  }

  /**
   * Callback for coordEach
   *
   * @callback coordEachCallback
   * @param {Array<number>} currentCoord The current coordinate being processed.
   * @param {number} coordIndex The current index of the coordinate being processed.
   * @param {number} featureIndex The current index of the Feature being processed.
   * @param {number} multiFeatureIndex The current index of the Multi-Feature being processed.
   * @param {number} geometryIndex The current index of the Geometry being processed.
   */

  /**
   * Iterate over coordinates in any GeoJSON object, similar to Array.forEach()
   *
   * @name coordEach
   * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
   * @param {Function} callback a method that takes (currentCoord, coordIndex, featureIndex, multiFeatureIndex)
   * @param {boolean} [excludeWrapCoord=false] whether or not to include the final coordinate of LinearRings that wraps the ring in its iteration.
   * @example
   * var features = turf.featureCollection([
   *   turf.point([26, 37], {"foo": "bar"}),
   *   turf.point([36, 53], {"hello": "world"})
   * ]);
   *
   * turf.coordEach(features, function (currentCoord, coordIndex, featureIndex, multiFeatureIndex, geometryIndex) {
   *   //=currentCoord
   *   //=coordIndex
   *   //=featureIndex
   *   //=multiFeatureIndex
   *   //=geometryIndex
   * });
   */
  function coordEach(geojson, callback, excludeWrapCoord) {
      // Handles null Geometry -- Skips this GeoJSON
      if (geojson === null) return;
      var j, k, l, geometry, stopG, coords,
          geometryMaybeCollection,
          wrapShrink = 0,
          coordIndex = 0,
          isGeometryCollection,
          type = geojson.type,
          isFeatureCollection = type === 'FeatureCollection',
          isFeature = type === 'Feature',
          stop = isFeatureCollection ? geojson.features.length : 1;

      // This logic may look a little weird. The reason why it is that way
      // is because it's trying to be fast. GeoJSON supports multiple kinds
      // of objects at its root: FeatureCollection, Features, Geometries.
      // This function has the responsibility of handling all of them, and that
      // means that some of the `for` loops you see below actually just don't apply
      // to certain inputs. For instance, if you give this just a
      // Point geometry, then both loops are short-circuited and all we do
      // is gradually rename the input until it's called 'geometry'.
      //
      // This also aims to allocate as few resources as possible: just a
      // few numbers and booleans, rather than any temporary arrays as would
      // be required with the normalization approach.
      for (var featureIndex = 0; featureIndex < stop; featureIndex++) {
          geometryMaybeCollection = (isFeatureCollection ? geojson.features[featureIndex].geometry :
              (isFeature ? geojson.geometry : geojson));
          isGeometryCollection = (geometryMaybeCollection) ? geometryMaybeCollection.type === 'GeometryCollection' : false;
          stopG = isGeometryCollection ? geometryMaybeCollection.geometries.length : 1;

          for (var geomIndex = 0; geomIndex < stopG; geomIndex++) {
              var multiFeatureIndex = 0;
              var geometryIndex = 0;
              geometry = isGeometryCollection ?
                  geometryMaybeCollection.geometries[geomIndex] : geometryMaybeCollection;

              // Handles null Geometry -- Skips this geometry
              if (geometry === null) continue;
              coords = geometry.coordinates;
              var geomType = geometry.type;

              wrapShrink = (excludeWrapCoord && (geomType === 'Polygon' || geomType === 'MultiPolygon')) ? 1 : 0;

              switch (geomType) {
              case null:
                  break;
              case 'Point':
                  callback(coords, coordIndex, featureIndex, multiFeatureIndex, geometryIndex);
                  coordIndex++;
                  multiFeatureIndex++;
                  break;
              case 'LineString':
              case 'MultiPoint':
                  for (j = 0; j < coords.length; j++) {
                      callback(coords[j], coordIndex, featureIndex, multiFeatureIndex, geometryIndex);
                      coordIndex++;
                      if (geomType === 'MultiPoint') multiFeatureIndex++;
                  }
                  if (geomType === 'LineString') multiFeatureIndex++;
                  break;
              case 'Polygon':
              case 'MultiLineString':
                  for (j = 0; j < coords.length; j++) {
                      for (k = 0; k < coords[j].length - wrapShrink; k++) {
                          callback(coords[j][k], coordIndex, featureIndex, multiFeatureIndex, geometryIndex);
                          coordIndex++;
                      }
                      if (geomType === 'MultiLineString') multiFeatureIndex++;
                      if (geomType === 'Polygon') geometryIndex++;
                  }
                  if (geomType === 'Polygon') multiFeatureIndex++;
                  break;
              case 'MultiPolygon':
                  for (j = 0; j < coords.length; j++) {
                      if (geomType === 'MultiPolygon') geometryIndex = 0;
                      for (k = 0; k < coords[j].length; k++) {
                          for (l = 0; l < coords[j][k].length - wrapShrink; l++) {
                              callback(coords[j][k][l], coordIndex, featureIndex, multiFeatureIndex, geometryIndex);
                              coordIndex++;
                          }
                          geometryIndex++;
                      }
                      multiFeatureIndex++;
                  }
                  break;
              case 'GeometryCollection':
                  for (j = 0; j < geometry.geometries.length; j++)
                      coordEach(geometry.geometries[j], callback, excludeWrapCoord);
                  break;
              default:
                  throw new Error('Unknown Geometry Type');
              }
          }
      }
  }

  /**
   * Callback for featureEach
   *
   * @callback featureEachCallback
   * @param {Feature<any>} currentFeature The current Feature being processed.
   * @param {number} featureIndex The current index of the Feature being processed.
   */

  /**
   * Iterate over features in any GeoJSON object, similar to
   * Array.forEach.
   *
   * @name featureEach
   * @param {FeatureCollection|Feature|Geometry} geojson any GeoJSON object
   * @param {Function} callback a method that takes (currentFeature, featureIndex)
   * @example
   * var features = turf.featureCollection([
   *   turf.point([26, 37], {foo: 'bar'}),
   *   turf.point([36, 53], {hello: 'world'})
   * ]);
   *
   * turf.featureEach(features, function (currentFeature, featureIndex) {
   *   //=currentFeature
   *   //=featureIndex
   * });
   */
  function featureEach(geojson, callback) {
      if (geojson.type === 'Feature') {
          callback(geojson, 0);
      } else if (geojson.type === 'FeatureCollection') {
          for (var i = 0; i < geojson.features.length; i++) {
              callback(geojson.features[i], i);
          }
      }
  }

  /**
   * Takes a set of features, calculates the bbox of all input features, and returns a bounding box.
   *
   * @name bbox
   * @param {GeoJSON} geojson any GeoJSON object
   * @returns {BBox} bbox extent in [minX, minY, maxX, maxY] order
   * @example
   * var line = turf.lineString([[-74, 40], [-78, 42], [-82, 35]]);
   * var bbox = turf.bbox(line);
   * var bboxPolygon = turf.bboxPolygon(bbox);
   *
   * //addToMap
   * var addToMap = [line, bboxPolygon]
   */
  function bbox(geojson) {
      var BBox = [Infinity, Infinity, -Infinity, -Infinity];
      coordEach(geojson, function (coord) {
          if (BBox[0] > coord[0]) BBox[0] = coord[0];
          if (BBox[1] > coord[1]) BBox[1] = coord[1];
          if (BBox[2] < coord[0]) BBox[2] = coord[0];
          if (BBox[3] < coord[1]) BBox[3] = coord[1];
      });
      return BBox;
  }

  /**
   * Unwrap a coordinate from a Point Feature, Geometry or a single coordinate.
   *
   * @name getCoord
   * @param {Array<number>|Geometry<Point>|Feature<Point>} obj Object
   * @returns {Array<number>} coordinates
   * @example
   * var pt = turf.point([10, 10]);
   *
   * var coord = turf.getCoord(pt);
   * //= [10, 10]
   */
  function getCoord(obj) {
      if (!obj) throw new Error('obj is required');

      var coordinates = getCoords(obj);

      // getCoord() must contain at least two numbers (Point)
      if (coordinates.length > 1 && isNumber(coordinates[0]) && isNumber(coordinates[1])) {
          return coordinates;
      } else {
          throw new Error('Coordinate is not a valid Point');
      }
  }

  /**
   * Unwrap coordinates from a Feature, Geometry Object or an Array of numbers
   *
   * @name getCoords
   * @param {Array<number>|Geometry|Feature} obj Object
   * @returns {Array<number>} coordinates
   * @example
   * var poly = turf.polygon([[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]);
   *
   * var coord = turf.getCoords(poly);
   * //= [[[119.32, -8.7], [119.55, -8.69], [119.51, -8.54], [119.32, -8.7]]]
   */
  function getCoords(obj) {
      if (!obj) throw new Error('obj is required');
      var coordinates;

      // Array of numbers
      if (obj.length) {
          coordinates = obj;

      // Geometry Object
      } else if (obj.coordinates) {
          coordinates = obj.coordinates;

      // Feature
      } else if (obj.geometry && obj.geometry.coordinates) {
          coordinates = obj.geometry.coordinates;
      }
      // Checks if coordinates contains a number
      if (coordinates) {
          containsNumber(coordinates);
          return coordinates;
      }
      throw new Error('No valid coordinates');
  }

  /**
   * Checks if coordinates contains a number
   *
   * @name containsNumber
   * @param {Array<any>} coordinates GeoJSON Coordinates
   * @returns {boolean} true if Array contains a number
   */
  function containsNumber(coordinates) {
      if (coordinates.length > 1 && isNumber(coordinates[0]) && isNumber(coordinates[1])) {
          return true;
      }

      if (Array.isArray(coordinates[0]) && coordinates[0].length) {
          return containsNumber(coordinates[0]);
      }
      throw new Error('coordinates must only contain numbers');
  }

  /**
   * Enforce expectations about types of {@link FeatureCollection} inputs for Turf.
   * Internally this uses {@link geojsonType} to judge geometry types.
   *
   * @name collectionOf
   * @param {FeatureCollection} featureCollection a FeatureCollection for which features will be judged
   * @param {string} type expected GeoJSON type
   * @param {string} name name of calling function
   * @throws {Error} if value is not the expected type.
   */
  function collectionOf(featureCollection, type, name) {
      if (!featureCollection) throw new Error('No featureCollection passed');
      if (!name) throw new Error('.collectionOf() requires a name');
      if (!featureCollection || featureCollection.type !== 'FeatureCollection') {
          throw new Error('Invalid input to ' + name + ', FeatureCollection required');
      }
      for (var i = 0; i < featureCollection.features.length; i++) {
          var feature = featureCollection.features[i];
          if (!feature || feature.type !== 'Feature' || !feature.geometry) {
              throw new Error('Invalid input to ' + name + ', Feature with geometry required');
          }
          if (!feature.geometry || feature.geometry.type !== type) {
              throw new Error('Invalid input to ' + name + ': must be a ' + type + ', given ' + feature.geometry.type);
          }
      }
  }

  /**
   * Get Geometry from Feature or Geometry Object
   *
   * @param {Feature|Geometry} geojson GeoJSON Feature or Geometry Object
   * @returns {Geometry|null} GeoJSON Geometry Object
   * @throws {Error} if geojson is not a Feature or Geometry Object
   * @example
   * var point = {
   *   "type": "Feature",
   *   "properties": {},
   *   "geometry": {
   *     "type": "Point",
   *     "coordinates": [110, 40]
   *   }
   * }
   * var geom = turf.getGeom(point)
   * //={"type": "Point", "coordinates": [110, 40]}
   */
  function getGeom(geojson) {
      if (!geojson) throw new Error('geojson is required');
      if (geojson.geometry !== undefined) return geojson.geometry;
      if (geojson.coordinates || geojson.geometries) return geojson;
      throw new Error('geojson must be a valid Feature or Geometry Object');
  }

  /**
   * Get GeoJSON object's type, Geometry type is prioritize.
   *
   * @param {GeoJSON} geojson GeoJSON object
   * @param {string} [name] name of the variable to display in error message
   * @returns {string} GeoJSON type
   * @example
   * var point = {
   *   "type": "Feature",
   *   "properties": {},
   *   "geometry": {
   *     "type": "Point",
   *     "coordinates": [110, 40]
   *   }
   * }
   * var geom = turf.getType(point)
   * //="Point"
   */
  function getType(geojson, name) {
      if (!geojson) throw new Error((name || 'geojson') + ' is required');
      // GeoJSON Feature & GeometryCollection
      if (geojson.geometry && geojson.geometry.type) return geojson.geometry.type;
      // GeoJSON Geometry & FeatureCollection
      if (geojson.type) return geojson.type;
      throw new Error((name || 'geojson') + ' is invalid');
  }

  /**
   * Returns true if a point is on a line. Accepts a optional parameter to ignore the start and end vertices of the linestring.
   *
   * @name booleanPointOnLine
   * @param {Coord} pt GeoJSON Point
   * @param {Feature<LineString>} line GeoJSON LineString
   * @param {Object} [options={}] Optional parameters
   * @param {boolean} [options.ignoreEndVertices=false] whether to ignore the start and end vertices.
   * @returns {boolean} true/false
   * @example
   * var pt = turf.point([0, 0]);
   * var line = turf.lineString([[-1, -1],[1, 1],[1.5, 2.2]]);
   * var isPointOnLine = turf.booleanPointOnLine(pt, line);
   * //=true
   */
  function booleanPointOnLine(pt, line, options) {
      // Optional parameters
      options = options || {};
      var ignoreEndVertices = options.ignoreEndVertices;
      if (!isObject$1(options)) throw new Error('invalid options');

      // Validate input
      if (!pt) throw new Error('pt is required');
      if (!line) throw new Error('line is required');

      // Normalize inputs
      var ptCoords = getCoord(pt);
      var lineCoords = getCoords(line);

      // Main
      for (var i = 0; i < lineCoords.length - 1; i++) {
          var ignoreBoundary = false;
          if (ignoreEndVertices) {
              if (i === 0) ignoreBoundary = 'start';
              if (i === lineCoords.length - 2) ignoreBoundary = 'end';
              if (i === 0 && i + 1 === lineCoords.length - 1) ignoreBoundary = 'both';
          }
          if (isPointOnLineSegment(lineCoords[i], lineCoords[i + 1], ptCoords, ignoreBoundary)) return true;
      }
      return false;
  }

  // See http://stackoverflow.com/a/4833823/1979085
  /**
   * @private
   * @param {Position} lineSegmentStart coord pair of start of line
   * @param {Position} lineSegmentEnd coord pair of end of line
   * @param {Position} pt coord pair of point to check
   * @param {boolean|string} excludeBoundary whether the point is allowed to fall on the line ends. If true which end to ignore.
   * @returns {boolean} true/false
   */
  function isPointOnLineSegment(lineSegmentStart, lineSegmentEnd, pt, excludeBoundary) {
      var x = pt[0];
      var y = pt[1];
      var x1 = lineSegmentStart[0];
      var y1 = lineSegmentStart[1];
      var x2 = lineSegmentEnd[0];
      var y2 = lineSegmentEnd[1];
      var dxc = pt[0] - x1;
      var dyc = pt[1] - y1;
      var dxl = x2 - x1;
      var dyl = y2 - y1;
      var cross = dxc * dyl - dyc * dxl;
      if (cross !== 0) {
          return false;
      }
      if (!excludeBoundary) {
          if (Math.abs(dxl) >= Math.abs(dyl)) {
              return dxl > 0 ? x1 <= x && x <= x2 : x2 <= x && x <= x1;
          }
          return dyl > 0 ? y1 <= y && y <= y2 : y2 <= y && y <= y1;
      } else if (excludeBoundary === 'start') {
          if (Math.abs(dxl) >= Math.abs(dyl)) {
              return dxl > 0 ? x1 < x && x <= x2 : x2 <= x && x < x1;
          }
          return dyl > 0 ? y1 < y && y <= y2 : y2 <= y && y < y1;
      } else if (excludeBoundary === 'end') {
          if (Math.abs(dxl) >= Math.abs(dyl)) {
              return dxl > 0 ? x1 <= x && x < x2 : x2 < x && x <= x1;
          }
          return dyl > 0 ? y1 <= y && y < y2 : y2 < y && y <= y1;
      } else if (excludeBoundary === 'both') {
          if (Math.abs(dxl) >= Math.abs(dyl)) {
              return dxl > 0 ? x1 < x && x < x2 : x2 < x && x < x1;
          }
          return dyl > 0 ? y1 < y && y < y2 : y2 < y && y < y1;
      }
  }

  // http://en.wikipedia.org/wiki/Even%E2%80%93odd_rule
  // modified from: https://github.com/substack/point-in-polygon/blob/master/index.js
  // which was modified from http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  /**
   * Takes a {@link Point} and a {@link Polygon} or {@link MultiPolygon} and determines if the point resides inside the polygon. The polygon can
   * be convex or concave. The function accounts for holes.
   *
   * @name booleanPointInPolygon
   * @param {Coord} point input point
   * @param {Feature<Polygon|MultiPolygon>} polygon input polygon or multipolygon
   * @param {Object} [options={}] Optional parameters
   * @param {boolean} [options.ignoreBoundary=false] True if polygon boundary should be ignored when determining if the point is inside the polygon otherwise false.
   * @returns {boolean} `true` if the Point is inside the Polygon; `false` if the Point is not inside the Polygon
   * @example
   * var pt = turf.point([-77, 44]);
   * var poly = turf.polygon([[
   *   [-81, 41],
   *   [-81, 47],
   *   [-72, 47],
   *   [-72, 41],
   *   [-81, 41]
   * ]]);
   *
   * turf.booleanPointInPolygon(pt, poly);
   * //= true
   */
  function booleanPointInPolygon(point, polygon, options) {
      // Optional parameters
      options = options || {};
      if (typeof options !== 'object') throw new Error('options is invalid');
      var ignoreBoundary = options.ignoreBoundary;

      // validation
      if (!point) throw new Error('point is required');
      if (!polygon) throw new Error('polygon is required');

      var pt = getCoord(point);
      var polys = getCoords(polygon);
      var type = (polygon.geometry) ? polygon.geometry.type : polygon.type;
      var bbox = polygon.bbox;

      // Quick elimination if point is not inside bbox
      if (bbox && inBBox(pt, bbox) === false) return false;

      // normalize to multipolygon
      if (type === 'Polygon') polys = [polys];

      for (var i = 0, insidePoly = false; i < polys.length && !insidePoly; i++) {
          // check if it is in the outer ring first
          if (inRing(pt, polys[i][0], ignoreBoundary)) {
              var inHole = false;
              var k = 1;
              // check for the point in any of the holes
              while (k < polys[i].length && !inHole) {
                  if (inRing(pt, polys[i][k], !ignoreBoundary)) {
                      inHole = true;
                  }
                  k++;
              }
              if (!inHole) insidePoly = true;
          }
      }
      return insidePoly;
  }

  /**
   * inRing
   *
   * @private
   * @param {Array<number>} pt [x,y]
   * @param {Array<Array<number>>} ring [[x,y], [x,y],..]
   * @param {boolean} ignoreBoundary ignoreBoundary
   * @returns {boolean} inRing
   */
  function inRing(pt, ring, ignoreBoundary) {
      var isInside = false;
      if (ring[0][0] === ring[ring.length - 1][0] && ring[0][1] === ring[ring.length - 1][1]) ring = ring.slice(0, ring.length - 1);

      for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
          var xi = ring[i][0], yi = ring[i][1];
          var xj = ring[j][0], yj = ring[j][1];
          var onBoundary = (pt[1] * (xi - xj) + yi * (xj - pt[0]) + yj * (pt[0] - xi) === 0) &&
              ((xi - pt[0]) * (xj - pt[0]) <= 0) && ((yi - pt[1]) * (yj - pt[1]) <= 0);
          if (onBoundary) return !ignoreBoundary;
          var intersect = ((yi > pt[1]) !== (yj > pt[1])) &&
          (pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi);
          if (intersect) isInside = !isInside;
      }
      return isInside;
  }

  /**
   * inBBox
   *
   * @private
   * @param {Position} pt point [x,y]
   * @param {BBox} bbox BBox [west, south, east, north]
   * @returns {boolean} true/false if point is inside BBox
   */
  function inBBox(pt, bbox) {
      return bbox[0] <= pt[0] &&
             bbox[1] <= pt[1] &&
             bbox[2] >= pt[0] &&
             bbox[3] >= pt[1];
  }

  /**
   * Boolean-within returns true if the first geometry is completely within the second geometry.
   * The interiors of both geometries must intersect and, the interior and boundary of the primary (geometry a)
   * must not intersect the exterior of the secondary (geometry b).
   * Boolean-within returns the exact opposite result of the `@turf/boolean-contains`.
   *
   * @name booleanWithin
   * @param {Geometry|Feature<any>} feature1 GeoJSON Feature or Geometry
   * @param {Geometry|Feature<any>} feature2 GeoJSON Feature or Geometry
   * @returns {boolean} true/false
   * @example
   * var line = turf.lineString([[1, 1], [1, 2], [1, 3], [1, 4]]);
   * var point = turf.point([1, 2]);
   *
   * turf.booleanWithin(point, line);
   * //=true
   */
  function booleanWithin(feature1, feature2) {
      var type1 = getType(feature1);
      var type2 = getType(feature2);
      var geom1 = getGeom(feature1);
      var geom2 = getGeom(feature2);

      switch (type1) {
      case 'Point':
          switch (type2) {
          case 'MultiPoint':
              return isPointInMultiPoint(geom1, geom2);
          case 'LineString':
              return booleanPointOnLine(geom1, geom2, {ignoreEndVertices: true});
          case 'Polygon':
              return booleanPointInPolygon(geom1, geom2, {ignoreBoundary: true});
          default:
              throw new Error('feature2 ' + type2 + ' geometry not supported');
          }
      case 'MultiPoint':
          switch (type2) {
          case 'MultiPoint':
              return isMultiPointInMultiPoint(geom1, geom2);
          case 'LineString':
              return isMultiPointOnLine(geom1, geom2);
          case 'Polygon':
              return isMultiPointInPoly(geom1, geom2);
          default:
              throw new Error('feature2 ' + type2 + ' geometry not supported');
          }
      case 'LineString':
          switch (type2) {
          case 'LineString':
              return isLineOnLine(geom1, geom2);
          case 'Polygon':
              return isLineInPoly(geom1, geom2);
          default:
              throw new Error('feature2 ' + type2 + ' geometry not supported');
          }
      case 'Polygon':
          switch (type2) {
          case 'Polygon':
              return isPolyInPoly(geom1, geom2);
          default:
              throw new Error('feature2 ' + type2 + ' geometry not supported');
          }
      default:
          throw new Error('feature1 ' + type1 + ' geometry not supported');
      }
  }

  function isPointInMultiPoint(point, multiPoint) {
      var i;
      var output = false;
      for (i = 0; i < multiPoint.coordinates.length; i++) {
          if (compareCoords(multiPoint.coordinates[i], point.coordinates)) {
              output = true;
              break;
          }
      }
      return output;
  }

  function isMultiPointInMultiPoint(multiPoint1, multiPoint2) {
      for (var i = 0; i < multiPoint1.coordinates.length; i++) {
          var anyMatch = false;
          for (var i2 = 0; i2 < multiPoint2.coordinates.length; i2++) {
              if (compareCoords(multiPoint1.coordinates[i], multiPoint2.coordinates[i2])) {
                  anyMatch = true;
              }
          }
          if (!anyMatch) {
              return false;
          }
      }
      return true;
  }

  function isMultiPointOnLine(multiPoint, lineString) {
      var foundInsidePoint = false;

      for (var i = 0; i < multiPoint.coordinates.length; i++) {
          if (!booleanPointOnLine(multiPoint.coordinates[i], lineString)) {
              return false;
          }
          if (!foundInsidePoint) {
              foundInsidePoint = booleanPointOnLine(multiPoint.coordinates[i], lineString, {ignoreEndVertices: true});
          }
      }
      return foundInsidePoint;
  }

  function isMultiPointInPoly(multiPoint, polygon) {
      var output = true;
      for (var i = 0; i < multiPoint.coordinates.length; i++) {
          var isInside = booleanPointInPolygon(multiPoint.coordinates[1], polygon);
          if (!isInside) {
              output = false;
              break;
          }
          {
              isInside = booleanPointInPolygon(multiPoint.coordinates[1], polygon, {ignoreBoundary: true});
          }
      }
      return output && isInside;
  }

  function isLineOnLine(lineString1, lineString2) {
      for (var i = 0; i < lineString1.coordinates.length; i++) {
          if (!booleanPointOnLine(lineString1.coordinates[i], lineString2)) {
              return false;
          }
      }
      return true;
  }

  function isLineInPoly(linestring, polygon) {
      var polyBbox = bbox(polygon);
      var lineBbox = bbox(linestring);
      if (!doBBoxOverlap(polyBbox, lineBbox)) {
          return false;
      }
      var foundInsidePoint = false;

      for (var i = 0; i < linestring.coordinates.length - 1; i++) {
          if (!booleanPointInPolygon(linestring.coordinates[i], polygon)) {
              return false;
          }
          if (!foundInsidePoint) {
              foundInsidePoint = booleanPointInPolygon(linestring.coordinates[i], polygon, {ignoreBoundary: true});
          }
          if (!foundInsidePoint) {
              var midpoint = getMidpoint(linestring.coordinates[i], linestring.coordinates[i + 1]);
              foundInsidePoint = booleanPointInPolygon(midpoint, polygon, {ignoreBoundary: true});

          }
      }
      return foundInsidePoint;
  }

  /**
   * Is Polygon2 in Polygon1
   * Only takes into account outer rings
   *
   * @private
   * @param {Geometry|Feature<Polygon>} feature1 Polygon1
   * @param {Geometry|Feature<Polygon>} feature2 Polygon2
   * @returns {boolean} true/false
   */
  function isPolyInPoly(feature1, feature2) {
      var poly1Bbox = bbox(feature1);
      var poly2Bbox = bbox(feature2);
      if (!doBBoxOverlap(poly2Bbox, poly1Bbox)) {
          return false;
      }
      for (var i = 0; i < feature1.coordinates[0].length; i++) {
          if (!booleanPointInPolygon(feature1.coordinates[0][i], feature2)) {
              return false;
          }
      }
      return true;
  }

  function doBBoxOverlap(bbox1, bbox2) {
      if (bbox1[0] > bbox2[0]) return false;
      if (bbox1[2] < bbox2[2]) return false;
      if (bbox1[1] > bbox2[1]) return false;
      if (bbox1[3] < bbox2[3]) return false;
      return true;
  }

  /**
   * compareCoords
   *
   * @private
   * @param {Position} pair1 point [x,y]
   * @param {Position} pair2 point [x,y]
   * @returns {boolean} true/false if coord pairs match
   */
  function compareCoords(pair1, pair2) {
      return pair1[0] === pair2[0] && pair1[1] === pair2[1];
  }

  /**
   * getMidpoint
   *
   * @private
   * @param {Position} pair1 point [x,y]
   * @param {Position} pair2 point [x,y]
   * @returns {Position} midpoint of pair1 and pair2
   */
  function getMidpoint(pair1, pair2) {
      return [(pair1[0] + pair2[0]) / 2, (pair1[1] + pair2[1]) / 2];
  }

  //http://en.wikipedia.org/wiki/Haversine_formula
  //http://www.movable-type.co.uk/scripts/latlong.html

  /**
   * Calculates the distance between two {@link Point|points} in degrees, radians,
   * miles, or kilometers. This uses the
   * [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula)
   * to account for global curvature.
   *
   * @name distance
   * @param {Coord} from origin point
   * @param {Coord} to destination point
   * @param {Object} [options={}] Optional parameters
   * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
   * @returns {number} distance between the two points
   * @example
   * var from = turf.point([-75.343, 39.984]);
   * var to = turf.point([-75.534, 39.123]);
   * var options = {units: 'miles'};
   *
   * var distance = turf.distance(from, to, options);
   *
   * //addToMap
   * var addToMap = [from, to];
   * from.properties.distance = distance;
   * to.properties.distance = distance;
   */
  function distance(from, to, options) {
      // Optional parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var units = options.units;

      var coordinates1 = getCoord(from);
      var coordinates2 = getCoord(to);
      var dLat = degreesToRadians((coordinates2[1] - coordinates1[1]));
      var dLon = degreesToRadians((coordinates2[0] - coordinates1[0]));
      var lat1 = degreesToRadians(coordinates1[1]);
      var lat2 = degreesToRadians(coordinates2[1]);

      var a = Math.pow(Math.sin(dLat / 2), 2) +
            Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);

      return radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), units);
  }

  /**
   * Creates a {@link Point} grid from a bounding box, {@link FeatureCollection} or {@link Feature}.
   *
   * @name pointGrid
   * @param {Array<number>} bbox extent in [minX, minY, maxX, maxY] order
   * @param {number} cellSide the distance between points, in units
   * @param {Object} [options={}] Optional parameters
   * @param {string} [options.units='kilometers'] used in calculating cellSide, can be degrees, radians, miles, or kilometers
   * @param {Feature<Polygon|MultiPolygon>} [options.mask] if passed a Polygon or MultiPolygon, the grid Points will be created only inside it
   * @param {Object} [options.properties={}] passed to each point of the grid
   * @returns {FeatureCollection<Point>} grid of points
   * @example
   * var extent = [-70.823364, -33.553984, -70.473175, -33.302986];
   * var cellSide = 3;
   * var options = {units: 'miles'};
   *
   * var grid = turf.pointGrid(extent, cellSide, options);
   *
   * //addToMap
   * var addToMap = [grid];
   */
  function pointGrid(bbox, cellSide, options) {
      // Optional parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      // var units = options.units;
      var mask = options.mask;
      var properties = options.properties;

      // Containers
      var results = [];

      // Input Validation
      if (cellSide === null || cellSide === undefined) throw new Error('cellSide is required');
      if (!isNumber(cellSide)) throw new Error('cellSide is invalid');
      if (!bbox) throw new Error('bbox is required');
      if (!Array.isArray(bbox)) throw new Error('bbox must be array');
      if (bbox.length !== 4) throw new Error('bbox must contain 4 numbers');
      if (mask && ['Polygon', 'MultiPolygon'].indexOf(getType(mask)) === -1) throw new Error('options.mask must be a (Multi)Polygon');

      var west = bbox[0];
      var south = bbox[1];
      var east = bbox[2];
      var north = bbox[3];

      var xFraction = cellSide / (distance([west, south], [east, south], options));
      var cellWidth = xFraction * (east - west);
      var yFraction = cellSide / (distance([west, south], [west, north], options));
      var cellHeight = yFraction * (north - south);

      var bboxWidth = (east - west);
      var bboxHeight = (north - south);
      var columns = Math.floor(bboxWidth / cellWidth);
      var rows = Math.floor(bboxHeight / cellHeight);
      // adjust origin of the grid
      var deltaX = (bboxWidth - columns * cellWidth) / 2;
      var deltaY = (bboxHeight - rows * cellHeight) / 2;

      var currentX = west + deltaX;
      while (currentX <= east) {
          var currentY = south + deltaY;
          while (currentY <= north) {
              var cellPt = point([currentX, currentY], properties);
              if (mask) {
                  if (booleanWithin(cellPt, mask)) results.push(cellPt);
              } else {
                  results.push(cellPt);
              }
              currentY += cellHeight;
          }
          currentX += cellWidth;
      }

      return featureCollection(results);
  }

  /**
   * @license GNU Affero General Public License.
   * Copyright (c) 2015, 2015 Ronny Lorenz <ronny@tbi.univie.ac.at>
   * v. 1.2.0
   * https://github.com/RaumZeit/MarchingSquares.js
   */

  /**
   * Compute the isocontour(s) of a scalar 2D field given
   * a certain threshold by applying the Marching Squares
   * Algorithm. The function returns a list of path coordinates
   */
  var defaultSettings = {
      successCallback: null,
      verbose: false
  };

  var settings = {};

  function isoContours(data, threshold, options) {
      /* process options */
      options = options ? options : {};

      var optionKeys = Object.keys(defaultSettings);

      for (var i = 0; i < optionKeys.length; i++) {
          var key = optionKeys[i];
          var val = options[key];
          val = ((typeof val !== 'undefined') && (val !== null)) ? val : defaultSettings[key];

          settings[key] = val;
      }

      if (settings.verbose)
          console.log('MarchingSquaresJS-isoContours: computing isocontour for ' + threshold);

      var ret = contourGrid2Paths(computeContourGrid(data, threshold));

      if (typeof settings.successCallback === 'function')
          settings.successCallback(ret);

      return ret;
  }

  /*
    Thats all for the public interface, below follows the actual
    implementation
  */

  /*
  ################################
  Isocontour implementation below
  ################################
  */

  /* assume that x1 == 1 &&  x0 == 0 */
  function interpolateX(y, y0, y1) {
      return (y - y0) / (y1 - y0);
  }

  /* compute the isocontour 4-bit grid */
  function computeContourGrid(data, threshold) {
      var rows = data.length - 1;
      var cols = data[0].length - 1;
      var ContourGrid = { rows: rows, cols: cols, cells: [] };

      for (var j = 0; j < rows; ++j) {
          ContourGrid.cells[j] = [];
          for (var i = 0; i < cols; ++i) {
              /* compose the 4-bit corner representation */
              var cval = 0;

              var tl = data[j + 1][i];
              var tr = data[j + 1][i + 1];
              var br = data[j][i + 1];
              var bl = data[j][i];

              if (isNaN(tl) || isNaN(tr) || isNaN(br) || isNaN(bl)) {
                  continue;
              }
              cval |= ((tl >= threshold) ? 8 : 0);
              cval |= ((tr >= threshold) ? 4 : 0);
              cval |= ((br >= threshold) ? 2 : 0);
              cval |= ((bl >= threshold) ? 1 : 0);

              /* resolve ambiguity for cval == 5 || 10 via averaging */
              var flipped = false;
              if (cval === 5 || cval === 10) {
                  var average = (tl + tr + br + bl) / 4;
                  if (cval === 5 && (average < threshold)) {
                      cval = 10;
                      flipped = true;
                  } else if (cval === 10 && (average < threshold)) {
                      cval = 5;
                      flipped = true;
                  }
              }

              /* add cell to ContourGrid if it contains edges */
              if (cval !== 0 && cval !== 15) {
                  var top, bottom, left, right;
                  top = bottom = left = right = 0.5;
                  /* interpolate edges of cell */
                  if (cval === 1) {
                      left    = 1 - interpolateX(threshold, tl, bl);
                      bottom  = 1 - interpolateX(threshold, br, bl);
                  } else if (cval === 2) {
                      bottom  = interpolateX(threshold, bl, br);
                      right   = 1 - interpolateX(threshold, tr, br);
                  } else if (cval === 3) {
                      left    = 1 - interpolateX(threshold, tl, bl);
                      right   = 1 - interpolateX(threshold, tr, br);
                  } else if (cval === 4) {
                      top     = interpolateX(threshold, tl, tr);
                      right   = interpolateX(threshold, br, tr);
                  } else if (cval === 5) {
                      top     = interpolateX(threshold, tl, tr);
                      right   = interpolateX(threshold, br, tr);
                      bottom  = 1 - interpolateX(threshold, br, bl);
                      left    = 1 - interpolateX(threshold, tl, bl);
                  } else if (cval === 6) {
                      bottom  = interpolateX(threshold, bl, br);
                      top     = interpolateX(threshold, tl, tr);
                  } else if (cval === 7) {
                      left    = 1 - interpolateX(threshold, tl, bl);
                      top     = interpolateX(threshold, tl, tr);
                  } else if (cval === 8) {
                      left    = interpolateX(threshold, bl, tl);
                      top     = 1 - interpolateX(threshold, tr, tl);
                  } else if (cval === 9) {
                      bottom  = 1 - interpolateX(threshold, br, bl);
                      top     = 1 - interpolateX(threshold, tr, tl);
                  } else if (cval === 10) {
                      top     = 1 - interpolateX(threshold, tr, tl);
                      right   = 1 - interpolateX(threshold, tr, br);
                      bottom  = interpolateX(threshold, bl, br);
                      left    = interpolateX(threshold, bl, tl);
                  } else if (cval === 11) {
                      top     = 1 - interpolateX(threshold, tr, tl);
                      right   = 1 - interpolateX(threshold, tr, br);
                  } else if (cval === 12) {
                      left    = interpolateX(threshold, bl, tl);
                      right   = interpolateX(threshold, br, tr);
                  } else if (cval === 13) {
                      bottom  = 1 - interpolateX(threshold, br, bl);
                      right   = interpolateX(threshold, br, tr);
                  } else if (cval === 14) {
                      left    = interpolateX(threshold, bl, tl);
                      bottom  = interpolateX(threshold, bl, br);
                  } else {
                      console.log('MarchingSquaresJS-isoContours: Illegal cval detected: ' + cval);
                  }
                  ContourGrid.cells[j][i] = {
                      cval: cval,
                      flipped: flipped,
                      top: top,
                      right: right,
                      bottom: bottom,
                      left: left
                  };
              }

          }
      }

      return ContourGrid;
  }

  function isSaddle(cell) {
      return cell.cval === 5 || cell.cval === 10;
  }

  function isTrivial(cell) {
      return cell.cval === 0 || cell.cval === 15;
  }

  function clearCell(cell) {
      if ((!isTrivial(cell)) && (cell.cval !== 5) && (cell.cval !== 10)) {
          cell.cval = 15;
      }
  }

  function getXY(cell, edge) {
      if (edge === 'top') {
          return [cell.top, 1.0];
      } else if (edge === 'bottom') {
          return [cell.bottom, 0.0];
      } else if (edge === 'right') {
          return [1.0, cell.right];
      } else if (edge === 'left') {
          return [0.0, cell.left];
      }
  }

  function contourGrid2Paths(grid) {
      var paths = [];
      var path_idx = 0;
      var rows = grid.rows;
      var cols = grid.cols;
      var epsilon = 1e-7;

      grid.cells.forEach(function (g, j) {
          g.forEach(function (gg, i) {
              if ((typeof gg !== 'undefined') && (!isSaddle(gg)) && (!isTrivial(gg))) {
                  var p = tracePath(grid.cells, j, i);
                  var merged = false;
                  /* we may try to merge paths at this point */
                  if (p.info === 'mergeable') {
                      /*
              search backwards through the path array to find an entry
              that starts with where the current path ends...
            */
                      var x = p.path[p.path.length - 1][0],
                          y = p.path[p.path.length - 1][1];

                      for (var k = path_idx - 1; k >= 0; k--) {
                          if ((Math.abs(paths[k][0][0] - x) <= epsilon) && (Math.abs(paths[k][0][1] - y) <= epsilon)) {
                              for (var l = p.path.length - 2; l >= 0; --l) {
                                  paths[k].unshift(p.path[l]);
                              }
                              merged = true;
                              break;
                          }
                      }
                  }
                  if (!merged)
                      paths[path_idx++] = p.path;
              }
          });
      });

      return paths;
  }

  /*
    construct consecutive line segments from starting cell by
    walking arround the enclosed area clock-wise
    */
  function tracePath(grid, j, i) {
      var maxj = grid.length;
      var p = [];
      var dxContour = [0, 0, 1, 1, 0, 0, 0, 0, -1, 0, 1, 1, -1, 0, -1, 0];
      var dyContour = [0, -1, 0, 0, 1, 1, 1, 1, 0, -1, 0, 0, 0, -1, 0, 0];
      var dx, dy;
      var startEdge = ['none', 'left', 'bottom', 'left', 'right', 'none', 'bottom', 'left', 'top', 'top', 'none', 'top', 'right', 'right', 'bottom', 'none'];
      var nextEdge  = ['none', 'bottom', 'right', 'right', 'top', 'top', 'top', 'top', 'left', 'bottom', 'right', 'right', 'left', 'bottom', 'left', 'none'];
      var edge;

      var startCell   = grid[j][i];
      var currentCell = grid[j][i];

      var cval = currentCell.cval;
      var edge = startEdge[cval];

      var pt = getXY(currentCell, edge);

      /* push initial segment */
      p.push([i + pt[0], j + pt[1]]);
      edge = nextEdge[cval];
      pt = getXY(currentCell, edge);
      p.push([i + pt[0], j + pt[1]]);
      clearCell(currentCell);

      /* now walk arround the enclosed area in clockwise-direction */
      var k = i + dxContour[cval];
      var l = j + dyContour[cval];
      var prev_cval = cval;

      while ((k >= 0) && (l >= 0) && (l < maxj) && ((k != i) || (l != j))) {
          currentCell = grid[l][k];
          if (typeof currentCell === 'undefined') { /* path ends here */
              //console.log(k + " " + l + " is undefined, stopping path!");
              break;
          }
          cval = currentCell.cval;
          if ((cval === 0) || (cval === 15)) {
              return { path: p, info: 'mergeable' };
          }
          edge  = nextEdge[cval];
          dx    = dxContour[cval];
          dy    = dyContour[cval];
          if ((cval === 5) || (cval === 10)) {
              /* select upper or lower band, depending on previous cells cval */
              if (cval === 5) {
                  if (currentCell.flipped) { /* this is actually a flipped case 10 */
                      if (dyContour[prev_cval] === -1) {
                          edge  = 'left';
                          dx    = -1;
                          dy    = 0;
                      } else {
                          edge  = 'right';
                          dx    = 1;
                          dy    = 0;
                      }
                  } else { /* real case 5 */
                      if (dxContour[prev_cval] === -1) {
                          edge  = 'bottom';
                          dx    = 0;
                          dy    = -1;
                      }
                  }
              } else if (cval === 10) {
                  if (currentCell.flipped) { /* this is actually a flipped case 5 */
                      if (dxContour[prev_cval] === -1) {
                          edge  = 'top';
                          dx    = 0;
                          dy    = 1;
                      } else {
                          edge  = 'bottom';
                          dx    = 0;
                          dy    = -1;
                      }
                  } else {  /* real case 10 */
                      if (dyContour[prev_cval] === 1) {
                          edge  = 'left';
                          dx    = -1;
                          dy    = 0;
                      }
                  }
              }
          }
          pt = getXY(currentCell, edge);
          p.push([k + pt[0], l + pt[1]]);
          clearCell(currentCell);
          k += dx;
          l += dy;
          prev_cval = cval;
      }

      return { path: p, info: 'closed' };
  }

  /**
   * Takes a {@link Point} grid and returns a correspondent matrix {Array<Array<number>>}
   * of the 'property' values
   *
   * @name gridToMatrix
   * @param {FeatureCollection<Point>} grid of points
   * @param {Object} [options={}] Optional parameters
   * @param {string} [options.zProperty='elevation'] the property name in `points` from which z-values will be pulled
   * @param {boolean} [options.flip=false] returns the matrix upside-down
   * @param {boolean} [options.flags=false] flags, adding a `matrixPosition` array field ([row, column]) to its properties,
   * the grid points with coordinates on the matrix
   * @returns {Array<Array<number>>} matrix of property values
   * @example
   *   var extent = [-70.823364, -33.553984, -70.473175, -33.302986];
   *   var cellSize = 3;
   *   var grid = turf.pointGrid(extent, cellSize);
   *   // add a random property to each point between 0 and 60
   *   for (var i = 0; i < grid.features.length; i++) {
   *     grid.features[i].properties.elevation = (Math.random() * 60);
   *   }
   *   gridToMatrix(grid);
   *   //= [
   *     [ 1, 13, 10,  9, 10, 13, 18],
   *     [34,  8,  5,  4,  5,  8, 13],
   *     [10,  5,  2,  1,  2,  5,  4],
   *     [ 0,  4, 56, 19,  1,  4,  9],
   *     [10,  5,  2,  1,  2,  5, 10],
   *     [57,  8,  5,  4,  5,  0, 57],
   *     [ 3, 13, 10,  9,  5, 13, 18],
   *     [18, 13, 10,  9, 78, 13, 18]
   *   ]
   */
  function gridToMatrix(grid, options) {
      // Optional parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var zProperty = options.zProperty || 'elevation';
      var flip = options.flip;
      var flags = options.flags;

      // validation
      collectionOf(grid, 'Point', 'input must contain Points');

      var pointsMatrix = sortPointsByLatLng(grid, flip);

      var matrix = [];
      // create property matrix from sorted points
      // looping order matters here
      for (var r = 0; r < pointsMatrix.length; r++) {
          var pointRow = pointsMatrix[r];
          var row = [];
          for (var c = 0; c < pointRow.length; c++) {
              var point = pointRow[c];
              // Check if zProperty exist
              if (point.properties[zProperty]) row.push(point.properties[zProperty]);
              else row.push(0);
              // add flags
              if (flags === true) point.properties.matrixPosition = [r, c];
          }
          matrix.push(row);
      }

      return matrix;
  }

  /**
   * Sorts points by latitude and longitude, creating a 2-dimensional array of points
   *
   * @private
   * @param {FeatureCollection<Point>} points GeoJSON Point features
   * @param {boolean} [flip=false] returns the matrix upside-down
   * @returns {Array<Array<Point>>} points ordered by latitude and longitude
   */
  function sortPointsByLatLng(points, flip) {
      var pointsByLatitude = {};

      // divide points by rows with the same latitude
      featureEach(points, function (point) {
          var lat = getCoords(point)[1];
          if (!pointsByLatitude[lat]) pointsByLatitude[lat] = [];
          pointsByLatitude[lat].push(point);
      });

      // sort points (with the same latitude) by longitude
      var orderedRowsByLatitude = Object.keys(pointsByLatitude).map(function (lat) {
          var row = pointsByLatitude[lat];
          var rowOrderedByLongitude = row.sort(function (a, b) {
              return getCoords(a)[0] - getCoords(b)[0];
          });
          return rowOrderedByLongitude;
      });

      // sort rows (of points with the same latitude) by latitude
      var pointMatrix = orderedRowsByLatitude.sort(function (a, b) {
          if (flip) return getCoords(a[0])[1] - getCoords(b[0])[1];
          else return getCoords(b[0])[1] - getCoords(a[0])[1];
      });

      return pointMatrix;
  }

  /**
   * Takes a grid {@link FeatureCollection} of {@link Point} features with z-values and an array of
   * value breaks and generates [isolines](http://en.wikipedia.org/wiki/Isoline).
   *
   * @name isolines
   * @param {FeatureCollection<Point>} pointGrid input points
   * @param {Array<number>} breaks values of `zProperty` where to draw isolines
   * @param {Object} [options={}] Optional parameters
   * @param {string} [options.zProperty='elevation'] the property name in `points` from which z-values will be pulled
   * @param {Object} [options.commonProperties={}] GeoJSON properties passed to ALL isolines
   * @param {Array<Object>} [options.breaksProperties=[]] GeoJSON properties passed, in order, to the correspondent isoline;
   * the breaks array will define the order in which the isolines are created
   * @returns {FeatureCollection<MultiLineString>} a FeatureCollection of {@link MultiLineString} features representing isolines
   * @example
   * // create a grid of points with random z-values in their properties
   * var extent = [0, 30, 20, 50];
   * var cellWidth = 100;
   * var pointGrid = turf.pointGrid(extent, cellWidth, {units: 'miles'});
   *
   * for (var i = 0; i < pointGrid.features.length; i++) {
   *     pointGrid.features[i].properties.temperature = Math.random() * 10;
   * }
   * var breaks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
   *
   * var lines = turf.isolines(pointGrid, breaks, {zProperty: 'temperature'});
   *
   * //addToMap
   * var addToMap = [lines];
   */
  function isolines(pointGrid, breaks, options) {
      // Optional parameters
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var zProperty = options.zProperty || 'elevation';
      var commonProperties = options.commonProperties || {};
      var breaksProperties = options.breaksProperties || [];

      // Input validation
      collectionOf(pointGrid, 'Point', 'Input must contain Points');
      if (!breaks) throw new Error('breaks is required');
      if (!Array.isArray(breaks)) throw new Error('breaks must be an Array');
      if (!isObject$1(commonProperties)) throw new Error('commonProperties must be an Object');
      if (!Array.isArray(breaksProperties)) throw new Error('breaksProperties must be an Array');

      // Isoline methods
      var matrix = gridToMatrix(pointGrid, {zProperty: zProperty, flip: true});
      var createdIsoLines = createIsoLines(matrix, breaks, zProperty, commonProperties, breaksProperties);
      var scaledIsolines = rescaleIsolines(createdIsoLines, matrix, pointGrid);

      return featureCollection(scaledIsolines);
  }

  /**
   * Creates the isolines lines (featuresCollection of MultiLineString features) from the 2D data grid
   *
   * Marchingsquares process the grid data as a 3D representation of a function on a 2D plane, therefore it
   * assumes the points (x-y coordinates) are one 'unit' distance. The result of the isolines function needs to be
   * rescaled, with turfjs, to the original area and proportions on the map
   *
   * @private
   * @param {Array<Array<number>>} matrix Grid Data
   * @param {Array<number>} breaks Breaks
   * @param {string} zProperty name of the z-values property
   * @param {Object} [commonProperties={}] GeoJSON properties passed to ALL isolines
   * @param {Object} [breaksProperties=[]] GeoJSON properties passed to the correspondent isoline
   * @returns {Array<MultiLineString>} isolines
   */
  function createIsoLines(matrix, breaks, zProperty, commonProperties, breaksProperties) {
      var results = [];
      for (var i = 1; i < breaks.length; i++) {
          var threshold = +breaks[i]; // make sure it's a number

          var properties = Object.assign(
              {},
              commonProperties,
              breaksProperties[i]
          );
          properties[zProperty] = threshold;
          var isoline = multiLineString(isoContours(matrix, threshold), properties);

          results.push(isoline);
      }
      return results;
  }

  /**
   * Translates and scales isolines
   *
   * @private
   * @param {Array<MultiLineString>} createdIsoLines to be rescaled
   * @param {Array<Array<number>>} matrix Grid Data
   * @param {Object} points Points by Latitude
   * @returns {Array<MultiLineString>} isolines
   */
  function rescaleIsolines(createdIsoLines, matrix, points) {

      // get dimensions (on the map) of the original grid
      var gridBbox = bbox(points); // [ minX, minY, maxX, maxY ]
      var originalWidth = gridBbox[2] - gridBbox[0];
      var originalHeigth = gridBbox[3] - gridBbox[1];

      // get origin, which is the first point of the last row on the rectangular data on the map
      var x0 = gridBbox[0];
      var y0 = gridBbox[1];

      // get number of cells per side
      var matrixWidth = matrix[0].length - 1;
      var matrixHeight = matrix.length - 1;

      // calculate the scaling factor between matrix and rectangular grid on the map
      var scaleX = originalWidth / matrixWidth;
      var scaleY = originalHeigth / matrixHeight;

      var resize = function (point) {
          point[0] = point[0] * scaleX + x0;
          point[1] = point[1] * scaleY + y0;
      };

      // resize and shift each point/line of the createdIsoLines
      createdIsoLines.forEach(function (isoline) {
          coordEach(isoline, resize);
      });
      return createdIsoLines;
  }

  /* eslint-disable */

   /**
     * BezierSpline
     * https://github.com/leszekr/bezier-spline-js
     *
     * @private
     * @copyright
     * Copyright (c) 2013 Leszek Rybicki
     *
     * Permission is hereby granted, free of charge, to any person obtaining a copy
     * of this software and associated documentation files (the "Software"), to deal
     * in the Software without restriction, including without limitation the rights
     * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
     * copies of the Software, and to permit persons to whom the Software is
     * furnished to do so, subject to the following conditions:
     *
     * The above copyright notice and this permission notice shall be included in all
     * copies or substantial portions of the Software.
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
     * SOFTWARE.
     */
  var Spline$1 = function (options) {
      this.points = options.points || [];
      this.duration = options.duration || 10000;
      this.sharpness = options.sharpness || 0.85;
      this.centers = [];
      this.controls = [];
      this.stepLength = options.stepLength || 60;
      this.length = this.points.length;
      this.delay = 0;
      // this is to ensure compatibility with the 2d version
      for (var i = 0; i < this.length; i++) this.points[i].z = this.points[i].z || 0;
      for (var i = 0; i < this.length - 1; i++) {
          var p1 = this.points[i];
          var p2 = this.points[i + 1];
          this.centers.push({
              x: (p1.x + p2.x) / 2,
              y: (p1.y + p2.y) / 2,
              z: (p1.z + p2.z) / 2
          });
      }
      this.controls.push([this.points[0], this.points[0]]);
      for (var i = 0; i < this.centers.length - 1; i++) {
          var p1 = this.centers[i];
          var p2 = this.centers[i + 1];
          var dx = this.points[i + 1].x - (this.centers[i].x + this.centers[i + 1].x) / 2;
          var dy = this.points[i + 1].y - (this.centers[i].y + this.centers[i + 1].y) / 2;
          var dz = this.points[i + 1].z - (this.centers[i].y + this.centers[i + 1].z) / 2;
          this.controls.push([{
              x: (1.0 - this.sharpness) * this.points[i + 1].x + this.sharpness * (this.centers[i].x + dx),
              y: (1.0 - this.sharpness) * this.points[i + 1].y + this.sharpness * (this.centers[i].y + dy),
              z: (1.0 - this.sharpness) * this.points[i + 1].z + this.sharpness * (this.centers[i].z + dz)},
              {
                  x: (1.0 - this.sharpness) * this.points[i + 1].x + this.sharpness * (this.centers[i + 1].x + dx),
                  y: (1.0 - this.sharpness) * this.points[i + 1].y + this.sharpness * (this.centers[i + 1].y + dy),
                  z: (1.0 - this.sharpness) * this.points[i + 1].z + this.sharpness * (this.centers[i + 1].z + dz)}]);
      }
      this.controls.push([this.points[this.length - 1], this.points[this.length - 1]]);
      this.steps = this.cacheSteps(this.stepLength);
      return this;
  };

    /*
      Caches an array of equidistant (more or less) points on the curve.
    */
  Spline$1.prototype.cacheSteps = function (mindist) {
      var steps = [];
      var laststep = this.pos(0);
      steps.push(0);
      for (var t = 0; t < this.duration; t += 10) {
          var step = this.pos(t);
          var dist = Math.sqrt((step.x - laststep.x) * (step.x - laststep.x) + (step.y - laststep.y) * (step.y - laststep.y) + (step.z - laststep.z) * (step.z - laststep.z));
          if (dist > mindist) {
              steps.push(t);
              laststep = step;
          }
      }
      return steps;
  };

    /*
      returns angle and speed in the given point in the curve
    */
  Spline$1.prototype.vector = function (t) {
      var p1 = this.pos(t + 10);
      var p2 = this.pos(t - 10);
      return {
          angle:180 * Math.atan2(p1.y - p2.y, p1.x - p2.x) / 3.14,
          speed:Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y) + (p2.z - p1.z) * (p2.z - p1.z))
      };
  };

    /*
      Gets the position of the point, given time.

      WARNING: The speed is not constant. The time it takes between control points is constant.

      For constant speed, use Spline.steps[i];
    */
  Spline$1.prototype.pos = function (time) {

      function bezier(t, p1, c1, c2, p2) {
          var B = function (t) {
              var t2 = t * t, t3 = t2 * t;
              return [(t3), (3 * t2 * (1 - t)), (3 * t * (1 - t) * (1 - t)), ((1 - t) * (1 - t) * (1 - t))];
          };
          var b = B(t);
          var pos = {
              x : p2.x * b[0] + c2.x * b[1] + c1.x * b[2] + p1.x * b[3],
              y : p2.y * b[0] + c2.y * b[1] + c1.y * b[2] + p1.y * b[3],
              z : p2.z * b[0] + c2.z * b[1] + c1.z * b[2] + p1.z * b[3]
          };
          return pos;
      }
      var t = time - this.delay;
      if (t < 0) t = 0;
      if (t > this.duration) t = this.duration - 1;
      //t = t-this.delay;
      var t2 = (t) / this.duration;
      if (t2 >= 1) return this.points[this.length - 1];

      var n = Math.floor((this.points.length - 1) * t2);
      var t1 = (this.length - 1) * t2 - n;
      return bezier(t1, this.points[n], this.controls[n][1], this.controls[n + 1][0], this.points[n + 1]);
  };

  /**
   * Takes a {@link LineString|line} and returns a curved version
   * by applying a [Bezier spline](http://en.wikipedia.org/wiki/B%C3%A9zier_spline)
   * algorithm.
   *
   * The bezier spline implementation is by [Leszek Rybicki](http://leszek.rybicki.cc/).
   *
   * @name bezierSpline
   * @param {Feature<LineString>} line input LineString
   * @param {Object} [options={}] Optional parameters
   * @param {number} [options.resolution=10000] time in milliseconds between points
   * @param {number} [options.sharpness=0.85] a measure of how curvy the path should be between splines
   * @returns {Feature<LineString>} curved line
   * @example
   * var line = turf.lineString([
   *   [-76.091308, 18.427501],
   *   [-76.695556, 18.729501],
   *   [-76.552734, 19.40443],
   *   [-74.61914, 19.134789],
   *   [-73.652343, 20.07657],
   *   [-73.157958, 20.210656]
   * ]);
   *
   * var curved = turf.bezierSpline(line);
   *
   * //addToMap
   * var addToMap = [line, curved]
   * curved.properties = { stroke: '#0F0' };
   */
  function bezier(line, options) {
      // Optional params
      options = options || {};
      if (!isObject$1(options)) throw new Error('options is invalid');
      var resolution = options.resolution || 10000;
      var sharpness = options.sharpness || 0.85;

      // validation
      if (!line) throw new Error('line is required');
      if (!isNumber(resolution)) throw new Error('resolution must be an number');
      if (!isNumber(sharpness)) throw new Error('sharpness must be an number');

      var coords = [];
      var spline = new Spline$1({
          points: getGeom(line).coordinates.map(function (pt) {
              return {x: pt[0], y: pt[1]};
          }),
          duration: resolution,
          sharpness: sharpness
      });

      for (var i = 0; i < spline.duration; i += 10) {
          var pos = spline.pos(i);
          if (Math.floor(i / 100) % 2 === 0) {
              coords.push([pos.x, pos.y]);
          }
      }

      return lineString(coords, line.properties);
  }

  /**
   * 等值图生成
   * @author kongkongbuding
   * @since 2019.08.08
   */

  var name = 'IsoImage';
  var picture = 'image/png';
  var units = 'degrees';
  var sigma2 = 0.1;
  var alpha = 100;
  var isIE = 'ActiveXObject' in window;
  var min$2 = Math.min;
  var max$2 = Math.max;
  var abs$2 = Math.abs;
  var defaultKeyConfig = {
    x: 'x',
    y: 'y',
    v: 'v',
    clipX: '0',
    clipY: '1'
  };

  var existLeaflet = function() {

    var l = 'L' in window;

    if (!l) {
      
      console.log('未加载leaflet');

    }

    return l

  };

  function IsoImage(points, opt, callBack) {

    this.name = name;

    // 初始化
    this.initialize(points, opt, callBack);

    // 获取等值面
    this.getIsosurface = function(config, key) {

      if ( !this.alow() ) {

        return false

      }

      var cav = mix(
        [
          getIsosurface(this.option, this.pointGrid, this.isosurface, config)
        ],
        this.option,
        config
      );

      if ( key ) {
        
        return cav

      } 

      return cav.toDataURL(picture)

    };
    
    // 获取等值线
    this.getIsoline = function(config, key) {

      if ( !this.alow() ) {

        return false

      }

      var cav = mix(
        [
          getIsoline(this.option, this.isoline, config)
        ],
        this.option,
        config
      );

      if ( key ) {

        return cav

      }

      return cav.toDataURL(picture)

    };

    // 获取等值面+等值线
    this.getIsoImage = function(config, key) {
      
      if ( !this.alow() ) {

        return false

      }

      var cav = mix(
        [
          getIsosurface(this.option, this.pointGrid, this.isosurface, config),
          getIsoline(this.option, this.isoline, config)
        ],
        this.option,
        config
      );

      if ( key ) {

        return cav

      }

      return cav.toDataURL(picture)

    };

    // 获取图例
    this.getLegend = function(config, key) {
      
      var level = this.option.level || [];
      var legend = getLegend(level, config);

      if ( !legend ) {

        return false

      }

      if ( key ) {

        return legend

      }
      
      return legend.toDataURL('image/png')

    };

    // 地图图层
    this.layer = function(map, config) {

      if ( !existLeaflet() ) {

        return false

      } 
      
      config = Object.assign({}, {

        padding: 0.5,
        opacity: 0.1

      }, config);

      var clipLayer = ClipLayer(config);
      var style = {
        stroke: true,
        weight: 1,
        opacity: 0.7,
        fillOpacity: 0,
        color: '#ff0000',
        fillColor: '#ff0000',
        renderer: clipLayer
      };

      L['polygon'](this.option.fmtClip, style).addTo(map);

      config.clipLayer = clipLayer;

      var isoLayer = IsoLayer(config);

      return isoLayer

    };

    // 地图 获取等值面
    this.getLeafletIsosurface = function(layer, config) {

      if ( !existLeaflet() ) return

      var d = this.fmtLatlngsIsosurface;
      var group = leafletImage(d, 'polygon', layer, config);
      return L.featureGroup(group)
    };

    // 地图 获取等值线
    this.getLeafletIsoline = function(layer, config) {
      if ( !existLeaflet() ) {

        return false

      }

      var d = this.fmtLatlngsIsoline;
      var group = leafletImage(d, 'polyline', layer, config);

      return L.featureGroup(group)

    };

    // 地图 获取等值面+等值线
    this.getLeafletIsoImage = function(layer, config) {

      if ( !existLeaflet() ) {

        return false

      }

      var isosurface = this.fmtLatlngsIsosurface;
      var isoline = this.fmtLatlngsIsoline;
      var isosurfaceGroup = leafletImage(isosurface, 'polygon', layer, config);
      var isolineGroup = leafletImage(isoline, 'polyline', layer, config);
      var group = isosurfaceGroup.concat(isolineGroup);

      return L.featureGroup(group)

    };

    // 地图 获取图例
    this.getLeafletLegend = function(config) {

      if ( !existLeaflet() ) {

        return false

      }

      config = Object.assign({}, {

        position: 'bottomleft',
        gradient: true

      }, config);

      var level = this.option.level || [];
      var legend = getLegend(level, config);

      if ( !legend ) {

        return false

      }

      config.canvas = legend;
      
      return leafletLegend(config)

    };

  }

  IsoImage.prototype = {
    /**
     * 
     */
    constructor: IsoImage,
    /**
     * 初始化
     * @param {*} points 
     * @param {*} opt 
     * @param {*} callBack 
     */
    initialize: function(points, opt, callBack) {

      var ex = opt.extent;
      var level = opt.level;

      if ( !ex ) {

        return console.log('缺少参数extent(画布左上右下坐标)')

      } 

      if ( !level ) {

        return console.log('缺少参数level(色阶)')

      }

      level = fmtLevel(level);
      
      var extent = [
        min$2(ex[0][0], ex[1][0]),
        min$2(ex[0][1], ex[1][1]),
        max$2(ex[0][0], ex[1][0]),
        max$2(ex[0][1], ex[1][1])
      ];
      var size = [ex[1][0] - ex[0][0], ex[1][1] - ex[0][1]];
      var cellWidth = opt.cellWidth || signFigures(Math.sqrt(abs$2(size[0] * size[1] / 2000)));

      if ( isIE ) {

        cellWidth *= 2;

      }

      var key = Object.assign({}, defaultKeyConfig, opt.keyConfig);

      this.option = {

        worker: opt.worker,
        type: opt.type || 'idw',
        pow: opt.pow || 3,
        model: opt.model || 'spherical', // gaussian|exponential|spherical
        clip: opt.clip,
        fmtClip: opt.clip ? fmtLatLng(JSON.parse(JSON.stringify(opt.clip)), 2, key.clipX, key.clipY) : [],
        smooth: opt.smooth,
        ex: ex,
        extent: extent,
        size: size,
        cellWidth: cellWidth,
        level: level,
        key: key

      };

      var p = [];
      var v = [];
      var x = [];
      var y = [];
      
      if ( isArray(points) ) {

        for (var i = 0, len = points.length; i < len; i++) {

          if ( points[i][key.v] == void 0 ) {

            continue

          }

          var _v = points[i][key.v];
          var _x = points[i][key.x];
          var _y = points[i][key.y];

          p.push({
            x: _x,
            y: _y,
            v: _v
          });
          v.push(_v);
          x.push(_x);
          y.push(_y);

        }

      }

      this.points = p;
      this._v = v;
      this._x = x;
      this._y = y;

      var that = this;

      if ( opt.worker && window.Worker && !isIE ) {

        var pointGridWorker = new Worker(opt.worker + '/turf.js');

        pointGridWorker.onmessage = function(e) {

          that.pointGrid = e.data;
          that.calcGridValue();

          callBack && that.initReady(callBack);

        };

        pointGridWorker.postMessage(['pointGrid', extent, cellWidth, { units: units }]);

        return false

      }

      this.pointGrid = pointGrid(extent, cellWidth, { units: units });
      this.calcGridValue();

      callBack && this.initReady(callBack);

    },
    /**
     * 计算网格值
     */
    calcGridValue: function() {

      var opt = this.option;
      var pointGrid = this.pointGrid;
      var a = this._v;
      var b = this._x;
      var c = this._y;
      var d = opt.model;
      var e = sigma2;
      var f = alpha;

      switch (opt.type) {

        case 'kriging':

          if ( opt.worker && window.Worker && !isIE ) {

            var krigingWorker = new Worker(opt.worker + '/' + opt.type + '.js');
            var that = this;

            krigingWorker.onmessage = function(e) {

              that.pointGrid = e.data;
              that.pointGridState = true;
              that.calcIso();

            };

            krigingWorker.postMessage([pointGrid, a, b, c, d, e, f]);

            return false

          }

          var variogram = kriging.train(a, b, c, d, e, f );

          for (var i = 0; i < pointGrid.features.length; i++) {

            var krigingVal = kriging.predict(

              pointGrid.features[i].geometry.coordinates[0],
              pointGrid.features[i].geometry.coordinates[1],
              variogram

            );

            pointGrid.features[i].properties.val = krigingVal;

          }

          this.pointGridState = true;
          this.calcIso();

          break

        default:

          var points = this.points;

          if ( opt.worker && window.Worker && !isIE ) {

            var defaultWorker = new Worker(opt.worker + '/' + opt.type + '.js');
            var that = this;

            defaultWorker.onmessage = function(e) {

              that.pointGrid = e.data;
              that.pointGridState = true;
              that.calcIso();

            };

            defaultWorker.postMessage([points, pointGrid, opt.pow]);

            return false

          }

          this.pointGrid = idw(points, pointGrid, opt.pow);
          this.pointGridState = true;

          this.calcIso();

          break

      }

    },
    /**
     * 计算等值线 面
     */
    calcIso: function() {

      var opt = this.option;
      var pointGrid = this.pointGrid;
      var level = opt.level;
      var breaks = [];
      var that = this;

      for (var i = 0, len = level.length; i < len; i++) {

        breaks.push(level[i].value);

      }

      if ( opt.worker && window.Worker && !isIE ) {

        var turfIsolinesWorker = new Worker(opt.worker + '/turf.js');
        var that = this;

        turfIsolinesWorker.onmessage = function(e) {

          var lines = e.data;

          that.isoline = lines;

          var linesExtent = getExtent(lines.features);

          try {

            that.isosurface = calcBlock(lines, linesExtent, pointGrid, level);

          } catch (err) {

            console.log(err);

          }

          if (opt.smooth) {
            
            that.isoline = that.smooth(that.isoline);

            if (that.isosurface) that.isosurface = that.smooth(that.isosurface);

          }

          that.fmtLatlngsIsoline = fmtGeoJson(that.isoline);

          if (that.isosurface) that.fmtLatlngsIsosurface = fmtGeoJson(that.isosurface);

          that.isoLinesState = true;

        };

        turfIsolinesWorker.postMessage(['isolines', pointGrid, breaks, { zProperty: 'val' }, level]);

        return false

      }
      
      var lines = isolines(pointGrid, breaks, { zProperty: 'val' });
      var d = lines.features;

      for (var i = 0, len = d.length; i < len; i++) {

        var val = d[i].properties.val;

        for (var q = 0; level[q]; q++) {
          
          if ( level[q].value == val ) {

            d[i].properties.color = level[q].color;

            break

          }

        }

      }
      
      this.isoline = lines;

      try {

        this.isosurface = calcBlock(lines, opt.extent, pointGrid, level);

      } catch (err) {

        console.log(err);

      }

      this.isosurfaceWebgl = new IsosurfaceWebgl(opt.ex, pointGrid, level);

      if (opt.smooth) {
            
        this.isoline = this.smooth(this.isoline);
        this.isosurface = this.smooth(this.isosurface);

      }

      this.fmtLatlngsIsoline = fmtGeoJson(this.isoline);
      this.fmtLatlngsIsosurface = fmtGeoJson(this.isosurface);
      this.isoLinesState = true;

    },
    /**
     * 平滑
     * @param {*} GeoJson 
     */
    smooth: function(GeoJson) {

      var lFeatures = GeoJson.features;

      for (var i = 0; i < lFeatures.length; i++) {
        
        var coords = lFeatures[i].geometry.coordinates;
        var lCoords = [];

        for (var j = 0; j < coords.length; j++) {
          
          var coord = coords[j];
          var curved = Spline(coord, 5);
          lCoords.push(curved);

        }

        lFeatures[i].geometry.coordinates = lCoords;

      }

      return GeoJson

    },
    /**
     * 平滑
     * @param {*} GeoJson 
     */
    smooth2: function(GeoJson) {

      var lFeatures = GeoJson.features;

      for (var i = 0; i < lFeatures.length; i++) {
        
        var coords = lFeatures[i].geometry.coordinates;
        var lCoords = [];

        for (var j = 0; j < coords.length; j++) {

          var coord = coords[j];
          var line = lineString(coord);
          var curved = bezier(line, {
            
            resolution: coord.length * 600,
            sharpness: 0.85,
            stepLength: 1

          });

          lCoords.push(curved.geometry.coordinates);

        }

        lFeatures[i].geometry.coordinates = lCoords;

      }

      return GeoJson

    },
    /**
     * 计算完成检测
     */
    alow: function() {

      return this.pointGrid && this.isoline

    },
    /**
     * 准备好了吗？
     */
    initReady: function(callBack, config) {

      var timer = null;
      var that = this;

      timer = setInterval(function() {

        if ( that.pointGridState && that.isoLinesState ) {

          clearInterval(timer);

          callBack && callBack(that, config);

        }

      }, 10);

    },
    /**
     * 移除
     */
    remove: function() {

      for (var p in this) {

        delete this[p];

      }

      return this
      
    }
  };

  IsoImage.merge = merge;

  return IsoImage;

}));
