// 示例demo

import React from 'react';
function ReactChildrenDemo(props){
    conosle.log(props.children);
    console.log(React.Children.map(props.children),child=>[child,[child,child]])
    return props.children
}

export default ()=>(
    <ReactChildrenDemo>
        <span>demo1</span>
        <span>demo1</span>
    </ReactChildrenDemo>
)



/**
 * Maps children that are typically specified as `props.children`.
 *
 * See https://reactjs.org/docs/react-api.html#reactchildrenmap
 *
 *
 * @param {?*} children 传递进来的propsChildren.
 * @param {function(*, int)} func 为传递进来的遍历函数.
 * @param {*} context map函数执行的上下文.
 * @return {object} 函数执行返回的结果
 */

const traverseContextPool = [];
const POOL_SIZE = 10;
const SEPARATOR = '.';
const SUBSEPARATOR = ':';

// map函数
function mapChildren(children, func, context) {

    if (children === null) {
        return children;
    }

    const result = [];
    mapIntoWithKeyPrefixInternal(children, result, null, func, context);
}

function mapIntoWithKeyPrefixInternal(children, array, prefix, func, context) {
    // key相关，字符串处理
    let escapedPrefix = '';
    if (prefix != null) {
        escapedPrefix = escapeUserProvidedKey(prefix) + '/';
    }
    // 获取对象池中的对象（防止内存抖动）
    const traverseContext = getPooledTraverseContext(
        array,
        escapedPrefix,
        func,
        context
    )
    traverseAllChildren(children, mapSingleChildIntoContext, traverseContext);
    releaseTraverseContext(traverseContext);
    // 清除对象的属性，如果没超过对象池则在对象池中添加该对象
}

/**
 *
 *
 * @param {*} bookKeeping 为poolContext中获取的对象
 * @param {*} child
 * @param {*} childKey
 */
function mapSingleChildIntoContext(bookKeeping, child, childKey) {
    const {result, keyPrefix, func, context} = bookKeeping;
  
    let mappedChild = func.call(context, child, bookKeeping.count++);//mappedChild为调用React.Children.map()方法传递进来的遍历的方法生成的数据
    if (Array.isArray(mappedChild)) {//如果为数组则重新开始递归，并初始化函数为C=>C，避免无限渲染
      mapIntoWithKeyPrefixInternal(mappedChild, result, childKey, c => c);
    } else if (mappedChild != null) {
      if (isValidElement(mappedChild)) {
        mappedChild = cloneAndReplaceKey(
          mappedChild,
          // Keep both the (mapped) and old keys if they differ, just as
          // traverseAllChildren used to do for objects as children
          keyPrefix +
            (mappedChild.key && (!child || child.key !== mappedChild.key)
              ? escapeUserProvidedKey(mappedChild.key) + '/'
              : '') +
            childKey,
        );
      }
      result.push(mappedChild);
    }
  }

function releaseTraverseContext(traverseContext) {
    traverseContext.result = null;
    traverseContext.keyPrefix = null;
    traverseContext.func = null;
    traverseContext.context = null;
    traverseContext.count = 0;
    if (traverseContextPool.length < POOL_SIZE) {
        traverseContextPool.push(traverseContext);
    }
}

/**
 *
 *
 * @param {*} children 传递的props.children
 * @param {*} callback 为传递进来的mapSingleChildIntoContext函数
 * @param {*} traverseContext 从对象池中获取的对象，也是执行的上下文
 * @returns
 */
function traverseAllChildren(children, callback, traverseContext) {
    if (children == null) {
        return 0;
    }
    return traverseAllChildrenImpl(children, '', callback, traverseContext);
}

/**
 *
 *
 * @param {*} children  初始值 props.children，后续为递归传递的子节点
 * @param {*} nameSoFar 初始值 ''
 * @param {*} callback  mapSingleChildIntoContext
 * @param {*} traverseContext 这里的context为对象池中获取的对象
 */
function traverseAllChildrenImpl(
    children,
    nameSoFar,
    callback,
    traverseContext,
) {
    const type = typeof children;
    let invokeCallback = false;

    // 单个节点可以直接调用callback函数
    if (type === "undefined" || type === "boolean") {
        invokeCallback = true;
    } else {
        switch (type) {
            case 'string':
            case 'number':
                invokeCallback = true;
                break;
            case 'object':
                switch (children.$$typeof) {
                    case REACT_ELEMENT_TYPE:
                    case REACT_PORTAL_TYPE:
                        invokeCallback = true;
                }
        }
    }

    if (invokeCallback) {
        callback(
            traverseContext,
            children,
            // 如果它是唯一的子级，则将该名称视为包装在数组中
            // 所以如果子集的数量增加，这是一致的。
            nameSoFar === '' ? SEPARATOR + getComponentKey(children, 0) : nameSoFar,
        );
        return 1;
    }

    // 如果为数组的情况遍历递归自身再把children传递进去，直到传递进traverseAllChildrenImpl为一个单个节点
    let child;
    let nextName;
    let subtreeCount = 0;
    const nextNamePrefix =
        nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;//初始值为'.:'
    if (Array.isArray(children)) {
        for (let i = 0; i < children.length; i++) {
            child = children[i];
            nextName = nextNamePrefix + getComponentKey(child, i);
            subtreeCount += traverseAllChildrenImpl(
                child,
                nextName,
                callback,
                traverseContext,
            );
        }
    } else {
        const iteratorFn = getIteratorFn(children);
        if (typeof iteratorFn === 'function') {
            const iterator = iteratorFn.call(children);
            let step;
            let ii = 0;
            while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getComponentKey(child, ii++);
                subtreeCount += traverseAllChildrenImpl(
                    child,
                    nextName,
                    callback,
                    traverseContext,
                );
            }
        } else if (type === 'object') {
            let addendum = '';
            const childrenString = '' + children;
            invariant(
                false,
                'Objects are not valid as a React child (found: %s).%s',
                childrenString === '[object Object]'
                    ? 'object with keys {' + Object.keys(children).join(', ') + '}'
                    : childrenString,
                addendum,
            );
        }
    }
    return subtreeCount;
}

// 对象池的概念：如果对象池存在的话，就从对象池中去获取一个对象，只有在对象池为空的情况下才会主动创建对象，达到节省性能的目的
const POOL_SIZE = 10;
const traverseContextPool = [];//全局变量 对象池  减少清除对象带来的消耗
function getPooledTraverseContext(
  mapResult,
  keyPrefix,
  mapFunction,
  mapContext,
) {
  if (traverseContextPool.length) {
    const traverseContext = traverseContextPool.pop();
    traverseContext.result = mapResult;
    traverseContext.keyPrefix = keyPrefix;
    traverseContext.func = mapFunction;
    traverseContext.context = mapContext;
    traverseContext.count = 0;
    return traverseContext;
  } else {
    return {
      result: mapResult,
      keyPrefix: keyPrefix,
      func: mapFunction,
      context: mapContext,
      count: 0,
    };
  }
}


export {
    mapChildren as map
}



