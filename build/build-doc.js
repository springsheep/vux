var glob = require("glob")
var fs = require('fs')
var yaml = require('js-yaml')
var path = require('path')

function getPath(dir) {
  return path.join(__dirname, dir)
}
let gComponents = []

let maps = {
  NOTICE: 'THIS FILE IS AUTOGENERATED BY npm run pre-build'
}

function saveMaps(key, value) {
  console.log(key, value)
  if (/vux/.test(value)) {
    let index = value.indexOf('vux')
    value = value.slice(index + 4, value.length)
  }
  console.log(key, value)
  maps[key] = value.replace('../', '')
  fs.writeFileSync(getPath('../src/components/map.json'), JSON.stringify(maps, null, 2))
}

glob(getPath("../src/plugins/**/index.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Plugin', file)
  })
})

glob(getPath("../src/directives/**/index.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Directive', file)
  })
})

glob(getPath("../src/filters/*.js"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Filter', file)
  })
})

glob(getPath("../src/datas/*.json"), {}, function (er, files) {
  files.forEach(function (file) {
    let name = getComponentName(file)
    name = _camelCase(name)
    saveMaps(name + 'Data', file)
  })
})

glob(getPath("../src/components/**/*.vue"), {}, function (er, files) {
  // 生成组件路径映射
  // 语言配置
  let rs = {}
  let enRs = {}
  let zhCnRs = {}

  files.forEach(function (file) {

    let name = getComponentName(file)

    const importName = _camelCase(name)

    saveMaps(importName, file)

    let content = fs.readFileSync(file, 'utf-8')
    if (content.indexOf('</i18n>') > -1) {

      const name = getComponentName(file)

      const results = content.match(/<i18n[^>]*>([\s\S]*?)<\/i18n>/)
      const json = yaml.safeLoad(results[1])

      rs = Object.assign(rs, setKey(json, name))

      for (let i in json) {
        let enItem = {}
        enRs[i] = json[i].en
      }

      for (let i in json) {
        zhCnRs[i] = json[i]['zh-CN']
      }

    }

  })

  let dump = yaml.safeDump({
    en: enRs,
    'zh-CN': zhCnRs
  })
  dump = '# This file is built by build_locales.js, so don\'t try to modify it manually\n' + dump

  fs.writeFileSync(getPath('../src/locales/all.yml'), dump)
  fs.writeFileSync(getPath('../src/locales/en.yml'), yaml.safeDump(enRs))
  fs.writeFileSync(getPath('../src/locales/zh-CN.yml'), yaml.safeDump(zhCnRs))
})

function setKey(object, name) {
  for (let i in object) {
    object[`vux.${name}.${i}`] = object[i]
    delete object[i]
  }
  return object
}

glob(getPath('../src/**/metas.yml'), {}, function (err, files) {
  render(files)
  render(files, 'form')
  render(files, 'dialog')
  render(files, 'layout')
})

function getComponentName(path) {
  let list = path.split('/')
  if (list[list.length - 1] === 'index.vue' || list[list.length - 1] === 'index.js') {
    return list[list.length - 2]
  } else if (list[list.length - 1] === 'metas.yml') {
    return list[list.length - 2]
  } else if (/\.json/.test(path)) {
    return list[list.length - 1].replace('.json', '')
  } else if (/\.js/.test(path)) {
    return list[list.length - 1].replace('.js', '')
  } else {
    return list[list.length - 1].replace('.vue', '')
  }
}

function render(files, tag) {
  let components = []
  let infos = []

  files.forEach(function (file) {

    const name = getComponentName(file)
      // console.log('file', name)
    const content = fs.readFileSync(file, 'utf-8')
    const json = yaml.safeLoad(content)
      // console.log(name, json)
    let rs = {
      name: name,
      importName: _camelCase(name),
      deprecatedInfo: json.deprecated_info || '',
      props: json.props,
      events: json.events,
      slots: json.slots,
      extra: json.extra,
      after_extra: json.after_extra,
      tags: json.tags,
      items: json.items,
      json: json
    }

    let item = {
      name: name,
      icon: json.icon,
      color: json.color,
      importName: json.importName
    }

    if (item.icon && item.name) {
      gComponents.push(item)
    }

    infos.push({
      name,
      icon: json.icon,
      importName: json.importName,
      metas: json
    })

    if (tag && json.tags && json.tags.en && json.tags.en.indexOf(tag) === -1) {
      // console.log('不应该push', rs.name)
      return
    }
    if (tag && json.tags && !json.tags.en) {
      return
    }
    if (tag && !json.tags) {
      // console.log('也不应该push', rs.name)
      return
    }

    if (json.icon) {
      rs.icon = json.icon
    }
    if (json.color) {
      rs.color = json.color
    }
    if (json.import_code) {
      rs.import_code = json.import_code
    }
    rs.status = json.status || 'maintaining'
    if (rs.icon && rs.name) {
      // console.log('tag', tag, 'push', rs.name)
      components.push(rs)
    } else {
      // console.log('不满足要求', rs.name, rs.icon)
    }

  })

  fs.writeFileSync(getPath('../src/datas/vux_component_list.json'), JSON.stringify(gComponents, null, 2))

  buildChanges(infos)

  buildDemos(infos)

  // console.log(components)
  // console.log('components length', components.length)
  let langs = ['zh-CN', 'en']
  for (var i = 0; i < langs.length; i++) {
    let lang = langs[i]
    let docs = ''
      // console.log('lang is', lang)
    if (!tag) {
      // 生成docs
      docs += `---
nav: ${lang}
---
<!--${t('该文件为自动生成，请不要修改')}-->
  \n## ${t('组件列表')}`
    } else {
      // 生成docs
      docs += `---
nav: ${lang}
---
<!--${t('该文件为自动生成，请不要修改')}-->
  \n## ${tag}`
    }

    components.forEach(function (one) {
        docs += `\n### ${one.importName}_COM`
        if (one.status === 'deprecated') {
          docs += `\n<p class="warning">${t('该组件已经停止维护。')}${one.deprecatedInfo ? one.deprecatedInfo[lang] : ''}</p>\n`
        }
        docs += '\n``` js'
        if (one.import_code) {
          docs += `\n${one.import_code}`
        } else {
          docs += `\nimport { ${one.importName} } from 'vux'`
        }
        docs += '\n```\n'

        if (one.extra && typeof one.extra === 'string' && lang === 'zh-CN') {
          docs += '\n' + one.extra + '\n'
        }
        if (one.extra && typeof one.extra === 'object' && one.extra[lang]) {
          docs += '\n' + one.extra[lang] + '\n'
        }

        if (one.props || one.slots) {
          docs = getComponentInfo(one, lang, docs)
        }

        if (one.items) {
          docs = getComponentInfo({
            props: one.json[one.items[0]].props,
            slots: one.json[one.items[0]].slots,
            events: one.json[one.items[0]].events
          }, lang, docs)

          docs = getComponentInfo({
            props: one.json[one.items[1]].props,
            slots: one.json[one.items[1]].slots,
            events: one.json[one.items[1]].events
          }, lang, docs, one.items[0])
        }

        // after extra
        if (one.after_extra) {
          docs += '\n' + one.after_extra + '\n'
        }
        /**
        docs += `\n<div id="play-${one.importName}" class="component-play-box">
      Playground is coming soon
    </div>\n`
    */
        docs += `<br><br><br>`
      })
      // console.log(docs)
    if (!tag) {
      fs.writeFileSync(getPath(`../docs/${lang}/components.md`), docs)

    } else {
      fs.writeFileSync(getPath(`../docs/${lang}/components_${tag}.md`), docs)

    }
  }

}

function getComponentInfo(one, lang, docs, name) {
  // console.log(one.name)
  if (name === 'divider') {
    console.log('divider', one.slots)
  }
  if (one.props) {
    if (name) {
      docs += `\n<span class="vux-component-name">${_camelCase(name)}</span>\n`
    }
    // prop title
    docs += `\n<span class="vux-props-title">Props</span>\n`
    docs += `\n| ${t('名字')}   | ${t('类型')} | ${t('默认')}    | ${t('说明')}   |
|-------|-------|-------|-------|
`
    for (let i in one.props) {
      let prop = one.props[i][lang]
      docs += `| ${getKeyHTML(i)} | ${getTypeHTML(one.props[i].type)} | ${getColorHTML(one.props[i])} | ${prop} |\n`
    }
  }

  if (one.slots) {
    // slot title
    docs += `\n<span class="vux-props-title">Slots</span>\n`
    docs += `\n| ${t('名字')}    | ${t('说明')}   |
|-------|-------|
`
    for (let i in one.slots) {
      let slot = one.slots[i][lang]
      docs += `| ${getKeyHTML(i)} | ${slot} |\n`
    }
  }

  if (one.events) {
    // slot title
    docs += `\n<span class="vux-props-title">Events</span>\n`
    docs += `\n| ${t('名字')}    | ${t('参数')}   | ${t('说明')} | 
|-------|-------|-------|
`
    for (let i in one.events) {
      let intro = one.events[i][lang]
      let params = one.events[i]['params']
      docs += `| ${getKeyHTML(i)} |   ${params || '&nbsp;'} | ${intro} |\n`
    }
  }
  // docs += `<div></div>`
  // docs += `\n`
  // docs += `\n\n<span class="vux-props-title">Demo</span>\n`
  // docs += `\n<div id="play-${one.importName}" class="component-play-box"><a class="vux-demo-link" href="#" router-link="/zh-CN/demos/${one.name}">进入demo页面</a></div>\n`
  docs += `\n`
    // docs += `\n\n<span class="vux-props-title">Demo</span>\n`
  if (one.name || name) {
    docs += `\n<a class="vux-demo-link" href="#" router-link="/zh-CN/demos/${one.name || name}">进入demo页面</a>\n`
  }

  if (one.json && one.json.changes) {
    let lastestVersion = Object.keys(one.json.changes)[0]
    docs += `\n<br><span class="vux-props-title">Changes (${lastestVersion})</span>\n`

    docs += `<ul>`
    one.json.changes[lastestVersion]['zh-CN'].forEach(one => {
      docs += `${getChangeTagHTNL(one, '14px')}`
    })
    docs += `</ul>\n`
  }
  return docs
}

function getKeyHTML(key) {
  return `<span class="prop-key">${key}</span>`
}

function getTypeHTML(type) {
  type = type || 'String'
  return `<span class="type type-${type ? type.toLowerCase() : 'string'}">${type}</span>`
}

function getChangeTagHTNL(str, fontSize = '15px') {
  const _split = str.split(']')
  const type = _split[0].replace('[', '')
  const content = _split[1]
  return `<li><span style="font-size:${fontSize};"><span class="change change-${type}">${type}</span> ${content}</span></li>`
}

function getColorHTML(one) {
  one.default = typeof one.default === 'undefined' ? '' : one.default
  let value = one.default
  if (value === false) {
    return 'false'
  }
  if (!/#/.test(value)) {
    return value
  } else {
    return `<span class="type" style="width:65px;background-color:${value}">${value}</span>`
  }
}

let tMaps = {
  '组件列表': 'Components',
  '该组件已经停止维护。': 'This Component is Deprecated.',
  '名字': 'name',
  '类型': 'type',
  '参数': 'params',
  '默认': 'default',
  '说明': 'description',
  '该文件为自动生成，请不要修改': 'THIS FILE IS AUTOGENERATED, DONOT EDIT IT'
}

function t(key) {
  return tMaps[key] || key
}
/**
function transform (object, name) {
  let rs = {
    en: {},
    'zh-CN': {}
  }
  for(let i in object) {
    rs['en'][`vux.${name}.${i}`] = object[i]['en']
    rs['zh-CN'][`vux.${name}.${i}`] = object[i]['zh-CN'] 
  }
  return rs
}
**/

function camelCase(input) {
  let str = input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    // console.log('group', group1)
    return group1.toUpperCase();
  });

  // console.log('str is', str)
  str = str.replace(/_(.)/g, function (match, group1) {
    // console.log('group', group1)
    return group1.toUpperCase();
  });
  return str
}

function _camelCase(input) {
  let str = camelCase(input)
  return str.slice(0, 1).toUpperCase() + str.slice(1)
}

function buildDemos(infos) {
  infos.forEach((one) => {
    // console.log('build demo', one.name)
    let str = ''
    let url = `http://localhost:8082/#/component/${one.name}`
    str += `---
nav: zh-CN
---


### ${_camelCase(one.name)}_COM

<img width="100" src="http://qr.topscan.com/api.php?text=${encodeURIComponent(url)}"/>

#### Demo

 <div style="width:377px;height:667px;display:inline-block;border:1px dashed #ececec;border-radius:5px;overflow:hidden;">
   <iframe src="${url}" width="375" height="667" border="0" frameborder="0"></iframe>
 </div>
`

    try {
      str += `\n#### demo 代码\n`

      str += `
<p class="tip">下面的$t是Demo的i18n使用的翻译函数，一般情况下可以直接使用字符串。另外，下面代码隐藏了i18n标签部分的代码。</p>
`

      str += '\n``` html\n'

      let code = fs.readFileSync(`../../src/demos/${_camelCase(one.name)}.vue`, 'utf-8')
      str += `${code.replace(/<i18n[^>]*>([\s\S]*?)<\/i18n>/g, '')}\n`
      str += '```\n'

      str += `#### 文档

#### Github Issue`

      fs.writeFileSync(`../docs/zh-CN/demos/${one.name}.md`, str)

    } catch (e) {

    }

  })
}

function buildChanges(infos) {
  let rs = {}
  infos.forEach(one => {
    let name = one.name
    let metas = one.metas
    if (metas && metas.changes) {
      for (let i in metas.changes) {
        if (!rs[i]) {
          rs[i] = {}
        }
        rs[i][name] = metas.changes[i]['zh-CN']
      }
    }
  })
  let str = `---
nav: zh-CN
---\n`

  for (let i in rs) {
    str += `### ${i}_COM\n`
    for (let j in rs[i]) {
      str += `\n#### ${_camelCase(j)}\n`
      str += `<ul>`
      rs[i][j].forEach(one => {
        str += `${getChangeTagHTNL(one)}`
      })
      str += `</ul>`
      str += `\n`
    }
  }

  str += '\n'

  fs.writeFileSync(getPath(`../docs/zh-CN/changes.md`), str)
}