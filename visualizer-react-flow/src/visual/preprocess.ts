import { State, View, Pool, Box, Abst, Container, ContainerConv, Member, BoxMember, ShapeKey } from '@app/visual/type';
import { isMemberText, isMemberLink, isMemberBox, isContainerConv } from '@app/visual/type';

export function preprocess(state: State) {
    for (let name in state) {
        preprocess_view(state[name]);
    }
}

function preprocess_view(view: View) {
    // clone members of ContainerConv
    for (let key in view.pool.containers) {
        let container = view.pool.containers[key];
        if (isContainerConv(container)) {
            preprocess_clone_conv_start(view.pool, container);
        }
    }
    // calculate node depth
    for (let key in view.pool.boxes) {
        let box = view.pool.boxes[key];
        if (box.parent == null) {
            preprocess_set_depth_box(view.pool, box, 0);
        }
    }
    for (let key in view.pool.containers) {
        let container = view.pool.containers[key];
        if (container.parent == null) {
            preprocess_set_depth_container(view.pool, container, 0);
        }
    }
    // dupliaction check
    for (let key in view.pool.boxes) {
        if (key in view.pool.containers) {
            console.log(`ERROR: duplicated ${key} in both boxes and containers`);
            console.log(view);
        }
    }
    for (let key in view.pool.containers) {
        if (key in view.pool.boxes) {
            console.log(`ERROR: duplicated ${key} in both boxes and containers`);
            console.log(view);
        }
    }
    // all-must-initialized check
    const poolMerged = {...view.pool.boxes, ...view.pool.containers};
    for (let key in poolMerged) {
        const shape = poolMerged[key];
        if (shape.depth === undefined) {
            // console.log(`ERR! depth of shape ${shape.key} not set`);
        }
    }
}

function preprocess_clone_conv_start(pool: Pool, container: ContainerConv) {
    for (let member of container.members) {
        let member_cloned = preprocess_clone_recursion(pool, member.key);
        if (member_cloned !== undefined) {
            member.key = member_cloned.key;
        }
    }
}
function preprocess_clone_recursion(pool: Pool, key: ShapeKey) {
    if (key in pool.boxes) {
        return preprocess_clone_box(pool, pool.boxes[key]);
    } else if (key in pool.containers) {
        return preprocess_clone_container(pool, pool.containers[key]);
    } else if (key != null) {
        console.log(`ERROR in clone: fail to find ${key} in ${pool}`)
    }
}
function preprocess_clone_box(pool: Pool, box: Box): Box {
    let box_cloned: Box = {
        ...box,
        key: box.key + '(cloned)',
        absts: {}
    };
    for (let name in box.absts) {
        let abst = box.absts[name];
        let abst_cloned: Abst = {
            ...abst,
            members: {}
        };
        for (let label in abst.members) {
            let member = abst.members[label];
            let member_cloned: Member = { ...member };
            if (isMemberText(member_cloned)) {
                ;
            } else if (isMemberLink(member_cloned) && member_cloned.target != null) {
                let target_cloned = preprocess_clone_recursion(pool, member_cloned.target);
                if (target_cloned !== undefined) {
                    member_cloned.target = target_cloned.key;
                }
            } else if (isMemberBox(member_cloned)) {
                let object_cloned = preprocess_clone_recursion(pool, member_cloned.object);
                if (object_cloned !== undefined) {
                    object_cloned.parent = box_cloned.key;
                    member_cloned.object = object_cloned.key;
                }
            }
            abst_cloned.members[label] = member_cloned;
        }
        box_cloned.absts[name] = abst_cloned;
    }
    pool.boxes[box_cloned.key] = box_cloned;
    return box_cloned;
}
function preprocess_clone_container(pool: Pool, container: Container | ContainerConv): Container | ContainerConv {
    let container_cloned: Container | ContainerConv = {
        ...container,
        key: container.key + '(cloned)'
    };
    for (let member of container_cloned.members) {
        let member_cloned = preprocess_clone_recursion(pool, member.key);
        if (member_cloned !== undefined) {
            member_cloned.parent = container_cloned.key;
            member.key = member_cloned.key;
        }
    }
    pool.containers[container_cloned.key] = container_cloned;
    return container_cloned;
}

function preprocess_set_depth_box(pool: Pool, box: Box, depth: number) {
    // console.log(`set box depth ${box.key}, ${depth}`);
    box.depth = depth;
    for (let name in box.absts) {
        let abst = box.absts[name];
        for (let label in abst.members) {
            const member = abst.members[label] as BoxMember;
            const key = member.object;
            if (key != null && key !== undefined) {
                preprocess_set_depth_recursion(pool, key, depth + 1);
            }
        }
    }
}
function preprocess_set_depth_container(pool: Pool, container: Container | ContainerConv, depth: number) {
    // console.log(`set container depth ${container.key}, ${depth}`);
    container.depth = depth;
    let ndepth = container.key.endsWith('Array') ? depth + 1 : depth;
    for (let member of container.members) {
        preprocess_set_depth_recursion(pool, member.key, ndepth);
    }
}
function preprocess_set_depth_recursion(pool: Pool, key: ShapeKey, depth: number) {
    if (key in pool.boxes) {
        preprocess_set_depth_box(pool, pool.boxes[key], depth);
    } else if (key in pool.containers) {
        preprocess_set_depth_container(pool, pool.containers[key], depth);
    } else if (key != null) {
        console.log(`ERROR in set depth: fail to find ${key} in ${pool}`)
    }
}
