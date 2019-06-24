const ReactDOM = {
    hydrate(element, container, callback) {
        return legacyRenderSubtreeIntoContainer(
            null,
            element,
            container,
            true,
            callback,
        );

    },
    /**
     *
     *
     * @param {React$Element<any>} element  //ReactElement
     * @param {DOMContainer} container  //挂载的DOM节点
     * @param {?Function} callback  //渲染结束以后调用的回调函数
     * @returns
     */
    render: function (element, container, callback) {
        return legacyRenderSubtreeIntoContainer(
            null,
            element,
            container,
            false,
            callback,
        );
    }
}


/**
 *
 *
 * @param {*} parentComponent   //null
 * @param {*} children          //ReactElement
 * @param {*} container         //DOM节点
 * @param {*} forceHydrate      //是否调和原有节点
 * @param {*} callback          //渲染以后执行的回调函数
 * @returns
 */
function legacyRenderSubtreeIntoContainer(
    parentComponent,
    children,
    container,
    forceHydrate,
    callback
) {
    // container为传入的DOM节点，_reactRootContainer第一次时渲染不存在，所以root为undefined
    let root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
        container,
        forceHydrate,
    );
    if (!root) {
        // 如果存在回调则进行封装
        if (typeof callback === 'function') {
            const originalCallback = callback;
            callback = function () {
                const instance = getPublicRootInstance(root._internalRoot);
                originalCallback.call(instance);
            };
        }
    } else {
        if (typeof callback === 'function') {
            const originalCallback = callback;
            callback = function () {
                const instance = getPublicRootInstance(root._internalRoot);
                originalCallback.call(instance);
            };
        }
        // Update
        if (parentComponent != null) {
            root.legacy_renderSubtreeIntoContainer(
                parentComponent,
                children,
                callback,
            );
        } else {
            root.render(children, callback);
        }
    }
    return getPublicRootInstance(root._internalRoot);

}

// 渲染子节点至容器中
/**
 *
 *
 * @param {*} container DOM容器节点
 * @param {*} forceHydrate 如果是render方法初始值为false如果是hydrate则为true
 * @returns
 */
function legacyCreateRootFromDOMContainer(
    container,
    forceHydrate,
) {
    // 如果为render方法调用，shouldHydrate为shouldHydrateDueToLegacyHeuristic方法返回的结果,
    //在当前版本中， shouldHydrateDueToLegacyHeuristic方法主要就是判断该容器下是否为document元素节点或者判定其下是否有子节点，如果有则返回true，进行调和
    const shouldHydrate =
        forceHydrate || shouldHydrateDueToLegacyHeuristic(container);
    if (!shouldHydrate) {//如果不需要调和则会删除root节点下的子节点
        let warned = false;
        let rootSibling;
        while ((rootSibling = container.lastChild)) {
            container.removeChild(rootSibling);
        }
    }
    // Legacy roots are not async by default.
    const isConcurrent = false;
    return new ReactRoot(container, isConcurrent, shouldHydrate);
}

// 通过判断传入的节点下是否有子节点来判断是否需要调和，复用原有节点来合并的一个过程（服务端渲染相关）
function shouldHydrateDueToLegacyHeuristic(container) {
    const rootElement = getReactRootElementInContainer(container);
    return !!(
        rootElement && //是否存在
        rootElement.nodeType === ELEMENT_NODE &&//是否为普通的ELEMENT_NODE
        rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME)//会在root节点上加上data-reactroot属性（服务端相关）
    );
}

// 判断传入的节点下是否有子节点来判断是否需要调和（返回结果boolean）
function getReactRootElementInContainer(container) {
    if (!container) {
        return null;
    }

    if (container.nodeType === DOCUMENT_NODE) {
        return container.documentElement;
    } else {
        return container.firstChild;
    }
}

function ReactRoot(
    container,//DOM容器节点
    isConcurrent,//初始值为false
    hydrate,//是否需要调和（初始值为false）
) {
    // 创建了一个Reactroot节点
    const root = createContainer(container, isConcurrent, hydrate);
    this._internalRoot = root;
}
ReactRoot.prototype.render = function (
    children,
    callback,
) {
    const root = this._internalRoot;
    const work = new ReactWork();
    callback = callback === undefined ? null : callback;
    if (callback !== null) {
        work.then(callback);
    }
    // render实际功能函数
    updateContainer(children, root, null, work._onCommit);
    return work;
};
ReactRoot.prototype.unmount = function (callback) {
    const root = this._internalRoot;
    const work = new ReactWork();
    callback = callback === undefined ? null : callback;
    if (__DEV__) {
        warnOnInvalidCallback(callback, 'render');
    }
    if (callback !== null) {
        work.then(callback);
    }
    updateContainer(null, root, null, work._onCommit);
    return work;
};
ReactRoot.prototype.legacy_renderSubtreeIntoContainer = function (
    parentComponent,
    children,
    callback,
) {
    const root = this._internalRoot;
    const work = new ReactWork();
    callback = callback === undefined ? null : callback;
    if (__DEV__) {
        warnOnInvalidCallback(callback, 'render');
    }
    if (callback !== null) {
        work.then(callback);
    }
    updateContainer(children, root, parentComponent, work._onCommit);
    return work;
};
ReactRoot.prototype.createBatch = function () {
    const batch = new ReactBatch(this);
    const expirationTime = batch._expirationTime;

    const internalRoot = this._internalRoot;
    const firstBatch = internalRoot.firstBatch;
    if (firstBatch === null) {
        internalRoot.firstBatch = batch;
        batch._next = null;
    } else {
        // Insert sorted by expiration time then insertion order
        let insertAfter = null;
        let insertBefore = firstBatch;
        while (
            insertBefore !== null &&
            insertBefore._expirationTime >= expirationTime
        ) {
            insertAfter = insertBefore;
            insertBefore = insertBefore._next;
        }
        batch._next = insertBefore;
        if (insertAfter !== null) {
            insertAfter._next = batch;
        }
    }

    return batch;
};

function getPublicRootInstance(container) {
    const containerFiber = container.current;
    if (!containerFiber.child) {
        return null;
    }
    switch (containerFiber.child.tag) {
        case HostComponent:
            return getPublicInstance(containerFiber.child.stateNode);
        default:
            return containerFiber.child.stateNode;
    }
}

function createContainer(
    containerInfo,//持久化更新中会用到，react-dom不会用到
    isConcurrent,
    hydrate,
) {
    return createFiberRoot(containerInfo, isConcurrent, hydrate);
}

function FiberRootNode(containerInfo, hydrate) {
    this.current = null;
    this.containerInfo = containerInfo;
    this.pendingChildren = null;
    this.pingCache = null;
    this.pendingCommitExpirationTime = NoWork;
    this.finishedWork = null;
    this.timeoutHandle = noTimeout;
    this.context = null;
    this.pendingContext = null;
    this.hydrate = hydrate;
    this.firstBatch = null;
    this.callbackNode = null;
    this.callbackExpirationTime = NoWork;
    this.firstPendingTime = NoWork;
    this.lastPendingTime = NoWork;
    this.pingTime = NoWork;

    if (enableSchedulerTracing) {
        this.interactionThreadID = unstable_getThreadID();
        this.memoizedInteractions = new Set();
        this.pendingInteractionMap = new Map();
    }
}

function createFiberRoot(
    containerInfo,
    isConcurrent,
    hydrate,
) {
    const root = new FiberRootNode(containerInfo, hydrate);

    const uninitializedFiber = createHostRootFiber(isConcurrent);
    root.current = uninitializedFiber;
    uninitializedFiber.stateNode = root;

    return root;
}

function createHostRootFiber(isConcurrent) {
    let mode = isConcurrent ? ConcurrentMode | StrictMode : NoContext;
    if (enableProfilerTimer && isDevToolsPresent) {
      mode |= ProfileMode;
    }
  
    return createFiber(HostRoot, null, null, mode);
  }

//   0 = updateState
//   1=replaceState
//    2= forceUpdate
//     3=captureUpdate
  const createFiber = function(
    tag, 
    pendingProps,
    key,
    mode,
  ) {
    // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
    return new FiberNode(tag, pendingProps, key, mode);
  };