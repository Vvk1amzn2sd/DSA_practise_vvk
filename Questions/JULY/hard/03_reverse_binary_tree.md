## Reverse a Binary Tree

You are given the root of a binary tree. Your task is to reverse (mirror) the binary tree.

A binary tree is said to be reversed when its left and right children at every node are swapped recursively.

### Input

- You are given a binary tree serialized as a level-order string (with `'null'` representing absent nodes).
- Example: `"1,2,3,null,4,5,null"`

### Output

- Return the level-order serialization of the reversed binary tree (same format as input).
- Output should also use `'null'` for missing children and include trailing `'null'`s if necessary to reflect the complete structure.

### Example 1

**Input:**
```
"1,2,3"
```

**Output:**
```
"1,3,2"
```

### Example 2

**Input:**
```
"4,2,7,1,3,6,9"
```

**Output:**
```
"4,7,2,9,6,3,1"
```

### Constraints

- The input will have at most 1000 nodes.
- Values will be integers between -10⁴ and 10⁴.
- Your function must be named `reverseBinaryTree(root)` where `root` is the TreeNode object built from the parsed string.

---

### Helper Functions (for local testing)

To convert the string input into a TreeNode and serialize output back:

```python
def build_tree(data):
    if not data:
        return None
    values = data.split(',')
    root = TreeNode(int(values[0]))
    queue = [root]
    i = 1
    while i < len(values):
        current = queue.pop(0)
        if values[i] != 'null':
            current.left = TreeNode(int(values[i]))
            queue.append(current.left)
        i += 1
        if i < len(values) and values[i] != 'null':
            current.right = TreeNode(int(values[i]))
            queue.append(current.right)
        i += 1
    return root

def serialize_tree(root):
    if not root:
        return ""
    result = []
    queue = [root]
    while queue:
        node = queue.pop(0)
        if node:
            result.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append('null')
    return ','.join(result)
```
