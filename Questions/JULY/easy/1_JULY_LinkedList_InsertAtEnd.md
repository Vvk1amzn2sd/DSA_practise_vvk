# Day 1: Insert at End of Linked List

**Category:** Easy  
**Date:** July 02, 2025

---

## 🧠 Problem Statement

You are given a singly linked list. Implement a function to insert an element at the end of the linked list.

### Function Signature

```java
Node insertAtEnd(Node head, int data);
```

Where `Node` is defined as:

```java
class Node {
    int data;
    Node next;
}
```

---

## 📥 Input Format

- First line: Integer `n` — number of elements in the initial list.
- Second line: `n` space-separated integers — elements of the initial list.
- Third line: Integer `x` — the element to be inserted at the end.

---

## 📤 Output Format

- Output the linked list after insertion.

---

## ✅ Sample Input

```
5
10 20 30 40 50
60
```

### Output
```
10 20 30 40 50 60
```

---

## 🧪 Edge Test Cases

### Input 1 (Empty list)
```
0

42
```
#### Output
```
42
```

---

### Input 2 (Single element)
```
1
7
99
```
#### Output
```
7 99
```

---

### Input 3 (Large input)
```
100
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100
101
```

#### Output
```
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31 32 33 34 35 36 37 38 39 40 41 42 43 44 45 46 47 48 49 50 51 52 53 54 55 56 57 58 59 60 61 62 63 64 65 66 67 68 69 70 71 72 73 74 75 76 77 78 79 80 81 82 83 84 85 86 87 88 89 90 91 92 93 94 95 96 97 98 99 100 101
```

---

## 📘 Constraints

- `0 ≤ n ≤ 10^4`
- `-10^5 ≤ data ≤ 10^5`

---

## 🚀 Tags

`Linked List` `Insertion` `Data Structures`
