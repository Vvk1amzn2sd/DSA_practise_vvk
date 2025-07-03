# Inorder Traversal of Binary Tree

Given the root of a binary tree, return the inorder traversal of its nodes' values.

## Example

```
Input:
        1
         \
          2
         /
        3

Output:
[1, 3, 2]
```

## Constraints

- The number of nodes in the tree is in the range [0, 10⁴].
- -100 ≤ Node.val ≤ 100

## Input Format

- You are given a string representing the binary tree in level order traversal (null represents no node).
- For example: `"1,null,2,3"` represents the tree shown above.

## Output Format

- Return a list of integers representing the inorder traversal of the tree.

## Function Signature (for reference)

```python
def inorderTraversal(root: TreeNode) -> List[int]:
```
