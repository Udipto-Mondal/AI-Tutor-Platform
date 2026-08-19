# Data Structures and Algorithms: Essential Guide

## 1. Asymptotic Complexity and Big-O Notation
- **$O(1)$ Constant Time**: Hash table lookup (average case), array index access.
- **$O(\log N)$ Logarithmic Time**: Binary Search on a sorted array, Balanced BST operations.
- **$O(N)$ Linear Time**: Linear scan, counting elements.
- **$O(N \log N)$ Linearithmic Time**: Merge Sort, Heapsort, Quicksort (average case).
- **$O(N^2)$ Quadratic Time**: Bubble Sort, Insertion Sort, Selection Sort.

---

## 2. Trees and Graphs

### Binary Search Trees (BST)
A binary tree where for each node $u$:
- All keys in the left subtree $< key(u)$
- All keys in the right subtree $> key(u)$
- Balanced Trees (AVL, Red-Black Trees) guarantee $O(\log N)$ search, insertion, and deletion.

### Graph Traversal Algorithms
1. **Breadth-First Search (BFS)**:
   - Uses a Queue (FIFO).
   - Finds the shortest path in unweighted graphs.
   - Time Complexity: $O(V + E)$, Space Complexity: $O(V)$.
2. **Depth-First Search (DFS)**:
   - Uses a Stack (or recursion).
   - Useful for topological sorting, cycle detection, strongly connected components.
   - Time Complexity: $O(V + E)$, Space Complexity: $O(V)$.

---

## 3. Dynamic Programming (DP)
Dynamic Programming solves complex problems by breaking them down into overlapping subproblems and optimal substructure.
- **Memoization (Top-Down)**: Recursive with caching.
- **Tabulation (Bottom-Up)**: Iterative filling of a DP table.

Classic Problems:
- **0/1 Knapsack**: Maximize value within weight limit $W$. State transition: $DP[i][w] = \max(DP[i-1][w], DP[i-1][w-wt[i]] + val[i])$.
- **Longest Common Subsequence (LCS)**: Finds longest subsequence present in both strings.
