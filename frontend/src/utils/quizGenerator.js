/**
 * Smart Adaptive Quiz Generator for AI Tutor Platform
 * Generates authentic, rigorous, domain-aware quizzes from uploaded materials (PDF, MD, TXT)
 * in English and Bengali. Eliminates trivial guessing with realistic distractors
 * and ensures guaranteed question counts (5, 10, 15, 20, or custom count).
 */

import { cleanDocumentTitle } from './pdfExtractor.js';

/* ─── Curated High-Yield Topic Question Banks (15-20+ questions per topic) ─── */
export const CS_TOPIC_BANKS = {
  'Backpropagation & Gradients': [
    {
      id: 'q_bp_01',
      question_type: 'handwritten_derivation',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'Derive the gradient of the loss L with respect to weight w_ij^l in layer l using the calculus chain rule. Write down the step-by-step equations for delta_j^l and the weight update.',
      expected_answer: 'Step 1: dL/dw_ij^l = (dL/dz_j^l) * (dz_j^l/dw_ij^l). Step 2: Let delta_j^l = dL/dz_j^l. Step 3: dz_j^l/dw_ij^l = a_i^(l-1). Final: dL/dw_ij^l = delta_j^l * a_i^(l-1). Weight update: w_ij^l := w_ij^l - eta * (dL/dw_ij^l).',
      explanation: 'Backpropagation recursively propagates errors backward through layers by chain-multiplying local partial derivatives.',
      rubric: [
        { criterion: 'Chain Rule Decomposition', points: 0.40, description: 'Decomposes dL/dw into delta_j and activation a_i' },
        { criterion: 'Error Term Formulation', points: 0.35, description: 'Accurately defines delta_j with respect to pre-activation z_j' },
        { criterion: 'Weight Update Formula', points: 0.25, description: 'Applies learning rate eta to compute parameter adjustment' }
      ]
    },
    {
      id: 'q_bp_02',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'What causes the vanishing gradient problem during backpropagation through deep neural networks using Sigmoid activations?',
      options: [
        { key: 'A', text: 'Sigmoid derivative max is 0.25; chaining multiple layers drives gradients exponentially toward 0' },
        { key: 'B', text: 'Weight matrices become strictly orthogonal, preventing numerical rank decomposition' },
        { key: 'C', text: 'Accumulated momentum terms saturate intermediate bias vectors at positive infinity' },
        { key: 'D', text: 'Learning rate decays at an inverse square rate relative to epoch index' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Sigmoid derivative max is 0.25; chaining multiple layers drives gradients exponentially toward 0',
      explanation: 'Because sigma\'(z) <= 0.25, repeated multiplication over many layers causes the error signal in early layers to vanish.'
    },
    {
      id: 'q_bp_03',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'hard',
      question_text: 'How does the Adam optimizer dynamically adjust the learning rate for individual network parameters?',
      options: [
        { key: 'A', text: 'By dividing the bias-corrected first moment (momentum) by the square root of the second raw moment (RMSprop)' },
        { key: 'B', text: 'By multiplying parameter gradients by the inverse Hessian matrix computed on each mini-batch' },
        { key: 'C', text: 'By resetting parameter velocity vectors to zero whenever loss oscillations cross zero' },
        { key: 'D', text: 'By scaling learning rate strictly by the Euclidean L2 norm of the input feature tensor' }
      ],
      correct_option: 'A',
      expected_answer: 'A: By dividing the bias-corrected first moment by the square root of the second raw moment',
      explanation: 'Adam combines exponentially decaying averages of past gradients (momentum) and past squared gradients (RMSprop).'
    },
    {
      id: 'q_bp_04',
      question_type: 'short_answer',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'Explain why initializing all weights to identical constant values (e.g. all zeros or all ones) prevents a multi-layer neural network from learning distinct features.',
      expected_answer: 'Symmetric initialization causes all neurons in a hidden layer to compute identical activations and receive identical gradient updates, destroying feature diversity (symmetry breaking failure).',
      explanation: 'Without random symmetry breaking (e.g. He or Xavier initialization), all parallel hidden units remain indistinguishable clones.'
    },
    {
      id: 'q_bp_05',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'easy',
      question_text: 'In standard stochastic gradient descent, what mathematical direction does the parameter update vector point toward?',
      options: [
        { key: 'A', text: 'Opposite direction of the loss function gradient (-nabla L)' },
        { key: 'B', text: 'Perpendicular tangent vector along the loss surface contour' },
        { key: 'C', text: 'Positive direction of the highest loss curvature eigenvalue' },
        { key: 'D', text: 'Unit normal vector orthogonal to the input data hyperplane' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Opposite direction of the loss function gradient (-nabla L)',
      explanation: 'The gradient points toward steepest ascent, so moving in the opposite direction minimizes loss.'
    },
    {
      id: 'q_bp_06',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'hard',
      question_text: 'Why does He (Kaiming) initialization multiply the variance by 2 (Var(W) = 2 / n_in) specifically for ReLU activation networks?',
      options: [
        { key: 'A', text: 'ReLU zeroes out approximately half the input space (negative inputs), so doubling the initial variance maintains signal variance across layers' },
        { key: 'B', text: 'It accounts for the two-pass forward and backward computational steps' },
        { key: 'C', text: 'It normalizes the spectral radius of the weight matrix to exactly 2.0' },
        { key: 'D', text: 'It guarantees that all initial logits remain strictly positive' }
      ],
      correct_option: 'A',
      expected_answer: 'A: ReLU zeroes out approximately half the input space, so doubling variance maintains signal variance',
      explanation: 'Because ReLU eliminates negative activations, the expected variance drops by half. Multiplying by 2 preserves signal magnitude.'
    },
    {
      id: 'q_bp_07',
      question_type: 'short_answer',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'What is Gradient Clipping and in which class of deep learning architectures (e.g. RNNs, Transformers) is it most critical?',
      expected_answer: 'Gradient clipping rescales gradient vectors when their L2 norm exceeds a predefined threshold (g := g * (threshold / ||g||)). It is critical in Recurrent Neural Networks (RNNs) and deep autoregressive models to mitigate the exploding gradient problem during Backpropagation Through Time (BPTT).',
      explanation: 'Without clipping, repeated matrix multiplications over long recurrent sequences can cause parameter overflow (NaNs).'
    },
    {
      id: 'q_bp_08',
      question_type: 'handwritten_derivation',
      topic: 'Backpropagation & Gradients',
      difficulty: 'hard',
      question_text: 'Given the binary cross-entropy loss L = -[y*log(p) + (1-y)*log(1-p)] with sigmoid prediction p = sigma(z), derive the gradient dL/dz. Show your calculus steps.',
      expected_answer: 'dL/dp = -y/p + (1-y)/(1-p) = (p - y) / (p*(1-p)). dp/dz = p*(1-p). Using chain rule: dL/dz = (dL/dp) * (dp/dz) = [(p - y)/(p*(1-p))] * [p*(1-p)] = p - y.',
      explanation: 'The denominator of dL/dp perfectly cancels out the derivative of the sigmoid, leaving the elegant residual error term (p - y).',
      rubric: [
        { criterion: 'Loss Derivative with respect to p', points: 0.40, description: 'Correctly computes dL/dp = (p - y)/(p*(1-p))' },
        { criterion: 'Sigmoid Derivative with respect to z', points: 0.30, description: 'Applies dp/dz = p*(1-p)' },
        { criterion: 'Chain Rule Cancellation', points: 0.30, description: 'Cancels terms to arrive at p - y' }
      ]
    },
    {
      id: 'q_bp_09',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'How does Momentum accelerate gradient descent on ravines (surfaces that curve much more steeply in one dimension than another)?',
      options: [
        { key: 'A', text: 'Averages out high-frequency transverse oscillations while accumulating velocity along the persistent shallow descent direction' },
        { key: 'B', text: 'Inverts the Hessian matrix using low-rank Cholesky approximations' },
        { key: 'C', text: 'Forces the step size to scale inversely with the second derivative' },
        { key: 'D', text: 'Randomly rotates parameter coordinate axes after each mini-batch' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Averages out high-frequency transverse oscillations while accumulating velocity',
      explanation: 'Exponentially decaying velocity damps out oscillating perpendicular gradients while building momentum along the gentle slope.'
    },
    {
      id: 'q_bp_10',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'hard',
      question_text: 'What is the primary difference between standard SGD with Momentum and Nesterov Accelerated Gradient (NAG)?',
      options: [
        { key: 'A', text: 'NAG evaluates the loss gradient at an anticipated lookahead position (theta - gamma * v) rather than the current position' },
        { key: 'B', text: 'NAG computes gradients only on odd-numbered mini-batches to prevent overfitting' },
        { key: 'C', text: 'NAG replaces Euclidean L2 norm with Mahalanobis distance metric' },
        { key: 'D', text: 'NAG uses stochastic line search to determine optimal learning rates per step' }
      ],
      correct_option: 'A',
      expected_answer: 'A: NAG evaluates the loss gradient at an anticipated lookahead position rather than current position',
      explanation: 'Looking ahead allows NAG to begin braking before overshooting sharp ravines or valleys.'
    },
    {
      id: 'q_bp_11',
      question_type: 'short_answer',
      topic: 'Backpropagation & Gradients',
      difficulty: 'medium',
      question_text: 'Explain the difference between Batch Gradient Descent, Stochastic Gradient Descent (SGD), and Mini-batch Gradient Descent in terms of convergence stability and computational efficiency.',
      expected_answer: 'Batch GD computes gradients over the entire dataset (deterministic, stable, but computationally prohibitive for large datasets). SGD computes gradients per single sample (fast, but noisy trajectory). Mini-batch GD computes gradients over small batches (e.g. 32-256 samples), achieving GPU hardware parallelism with stable, robust convergence.',
      explanation: 'Mini-batch GD balances the statistical stability of full batch methods with the computational efficiency of single-sample SGD.'
    },
    {
      id: 'q_bp_12',
      question_type: 'mcq',
      topic: 'Backpropagation & Gradients',
      difficulty: 'easy',
      question_text: 'What computational data structure is maintained by automatic differentiation engines (like PyTorch Autograd) during the forward pass to enable backpropagation?',
      options: [
        { key: 'A', text: 'Directed Acyclic Graph (DAG) of tensor operations' },
        { key: 'B', text: 'Doubly linked circular queue of weight matrices' },
        { key: 'C', text: 'Binary Search Tree of activation scalars' },
        { key: 'D', text: 'Disjoint-set union structure of layer indices' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Directed Acyclic Graph (DAG) of tensor operations',
      explanation: 'The computational DAG tracks nodes (tensors) and edges (operations) so reverse-mode autodiff can traverse backwards to compute gradients.'
    }
  ],

  'Activation Functions': [
    {
      id: 'q_act_01',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'easy',
      question_text: 'Which activation function is specifically designed to eliminate the "Dying ReLU" problem by preserving a small non-zero slope for negative inputs?',
      options: [
        { key: 'A', text: 'Leaky ReLU / PReLU with f(x) = max(alpha * x, x) where alpha is around 0.01' },
        { key: 'B', text: 'Standard Sigmoid bounded between 0 and 1' },
        { key: 'C', text: 'Softmax applied over K normalized categorical output classes' },
        { key: 'D', text: 'Binary Heaviside step threshold function' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Leaky ReLU / PReLU with f(x) = max(alpha * x, x)',
      explanation: 'Leaky ReLU assigns a small positive slope alpha when x < 0, allowing gradients to flow even when neurons are inactive.'
    },
    {
      id: 'q_act_02',
      question_type: 'handwritten_derivation',
      topic: 'Activation Functions',
      difficulty: 'medium',
      question_text: 'Prove that the derivative of the Sigmoid function sigma(z) = 1 / (1 + exp(-z)) simplifies algebraically to sigma(z) * (1 - sigma(z)). Show your step-by-step calculus derivation.',
      expected_answer: 'd(sigma)/dz = exp(-z)/(1+exp(-z))^2 = (1/(1+exp(-z))) * (exp(-z)/(1+exp(-z))) = sigma(z) * ((1+exp(-z)-1)/(1+exp(-z))) = sigma(z) * (1 - sigma(z)).',
      explanation: 'This property makes logistic sigmoid differentiation computationally efficient during backpropagation.',
      rubric: [
        { criterion: 'Chain or Quotient Rule Application', points: 0.40, description: 'Correctly differentiates the denominator (1 + exp(-z))' },
        { criterion: 'Fraction Decomposition', points: 0.35, description: 'Factors expression into product of two reciprocal terms' },
        { criterion: 'Final Substitution', points: 0.25, description: 'Concludes with sigma(z) * (1 - sigma(z))' }
      ]
    },
    {
      id: 'q_act_03',
      question_type: 'short_answer',
      topic: 'Activation Functions',
      difficulty: 'medium',
      question_text: 'Why does a multi-layer perceptron composed entirely of linear activation functions (f(x) = c*x) fail to learn complex nonlinear patterns regardless of depth?',
      expected_answer: 'The composition of consecutive linear transformations is mathematically equivalent to a single linear transformation (W2 * W1 = W_combined). Stacking linear layers adds zero representational power.',
      explanation: 'Non-linear activations allow neural networks to approximate arbitrary continuous functions.'
    },
    {
      id: 'q_act_04',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'medium',
      question_text: 'Why is the Hyperbolic Tangent (tanh) activation function generally preferred over the Sigmoid function in hidden layers of feedforward networks?',
      options: [
        { key: 'A', text: 'tanh is zero-centered with outputs in [-1, 1], which prevents systematic directional bias in weight updates' },
        { key: 'B', text: 'tanh requires no floating-point exponential operations during forward evaluation' },
        { key: 'C', text: 'tanh derivative never drops below 1.0 for extreme input values' },
        { key: 'D', text: 'tanh guarantees exact convex loss optimization across all layer topologies' }
      ],
      correct_option: 'A',
      expected_answer: 'A: tanh is zero-centered with outputs in [-1, 1], which prevents systematic directional bias in weight updates',
      explanation: 'Zero-centered activations prevent gradients from oscillating exclusively in positive or negative directions.'
    },
    {
      id: 'q_act_05',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'easy',
      question_text: 'What mathematical property ensures that the outputs of a Softmax layer can be directly interpreted as a valid probability distribution?',
      options: [
        { key: 'A', text: 'All output values are strictly positive and their collective sum equals exactly 1.0' },
        { key: 'B', text: 'Outputs are normalized by dividing by the determinant of the input covariance matrix' },
        { key: 'C', text: 'Each logit is mapped to discrete integer values using stochastic rounding' },
        { key: 'D', text: 'Cross-entropy loss forces the Euclidean norm of the output vector to equal zero' }
      ],
      correct_option: 'A',
      expected_answer: 'A: All output values are strictly positive and their collective sum equals exactly 1.0',
      explanation: 'Softmax exponentiates logits to ensure positivity and divides by their sum to normalize to 1.'
    },
    {
      id: 'q_act_06',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'hard',
      question_text: 'Which modern activation function is formulated as x * Phi(x) (where Phi(x) is the standard normal cumulative distribution function) and is widely used in Transformer architectures like BERT and GPT?',
      options: [
        { key: 'A', text: 'GELU (Gaussian Error Linear Unit)' },
        { key: 'B', text: 'ELU (Exponential Linear Unit)' },
        { key: 'C', text: 'SELU (Scaled Exponential Linear Unit)' },
        { key: 'D', text: 'Swish (SiLU)' }
      ],
      correct_option: 'A',
      expected_answer: 'A: GELU (Gaussian Error Linear Unit)',
      explanation: 'GELU weights inputs by their percentile in a Gaussian distribution, introducing smooth stochastic regularization.'
    },
    {
      id: 'q_act_07',
      question_type: 'short_answer',
      topic: 'Activation Functions',
      difficulty: 'hard',
      question_text: 'Explain the Temperature parameter T in the Softmax function Softmax(z_i / T). What happens when T -> 0 versus when T -> infinity?',
      expected_answer: 'Temperature controls the entropy of the probability distribution. When T -> 0, the distribution approaches an argmax (one-hot spike on the highest logit). When T -> infinity, the distribution flattens into a uniform distribution (all classes have equal 1/K probability).',
      explanation: 'Temperature scaling is widely used in model calibration, distillation, and LLM generation sampling.'
    },
    {
      id: 'q_act_08',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'medium',
      question_text: 'Why does the standard ReLU function f(x) = max(0, x) drastically accelerate training speed compared to Sigmoid or Tanh?',
      options: [
        { key: 'A', text: 'Constant derivative of 1 for x > 0 eliminates saturation in the positive regime, and computing max(0, x) requires no expensive exponentials' },
        { key: 'B', text: 'ReLU computes analytic Hessians directly in hardware registers' },
        { key: 'C', text: 'ReLU automatically projects weights onto the unit hypersphere' },
        { key: 'D', text: 'ReLU completely eliminates the need for bias terms in dense layers' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Constant derivative of 1 for x > 0 eliminates saturation, requiring no exponentials',
      explanation: 'ReLU avoids exponential calculation and prevents gradient vanishing for positive activations.'
    },
    {
      id: 'q_act_09',
      question_type: 'handwritten_derivation',
      topic: 'Activation Functions',
      difficulty: 'hard',
      question_text: 'Derive the derivative of the Softmax function S_i = exp(z_i) / sum_k(exp(z_k)) with respect to input logit z_j. Consider both cases: i = j and i != j.',
      expected_answer: 'Case 1 (i = j): dS_i/dz_i = S_i * (1 - S_i). Case 2 (i != j): dS_i/dz_j = -S_i * S_j. Combined using Kronecker delta: dS_i/dz_j = S_i * (delta_ij - S_j).',
      explanation: 'Softmax Jacobian elements depend on whether diagonal (i=j) or off-diagonal (i!=j) coordinates are derived.',
      rubric: [
        { criterion: 'Quotient Rule Formulation', points: 0.35, description: 'Sets up derivative of numerator and denominator sum' },
        { criterion: 'Diagonal Case (i = j)', points: 0.35, description: 'Arrives at S_i * (1 - S_i)' },
        { criterion: 'Off-Diagonal Case (i != j)', points: 0.30, description: 'Arrives at -S_i * S_j' }
      ]
    },
    {
      id: 'q_act_10',
      question_type: 'mcq',
      topic: 'Activation Functions',
      difficulty: 'medium',
      question_text: 'What property does the Swish activation function f(x) = x * sigma(beta * x) possess that differentiates it from ReLU?',
      options: [
        { key: 'A', text: 'It is non-monotonic and smooth, allowing small negative values when x is slightly below zero' },
        { key: 'B', text: 'Its output is strictly bounded between 0 and 1' },
        { key: 'C', text: 'Its derivative is undefined at all rational numbers' },
        { key: 'D', text: 'It requires input tensors to have even dimensional rank' }
      ],
      correct_option: 'A',
      expected_answer: 'A: It is non-monotonic and smooth, allowing small negative values',
      explanation: 'Discovered via neural architecture search, Swish\'s non-monotonicity and continuous differentiability often yield higher accuracy than ReLU in deep models.'
    }
  ],

  'Data Structures & Big-O Complexity': [
    {
      id: 'q_dsa_01',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'medium',
      question_text: 'What is the average-case and worst-case time complexity of standard QuickSort on an array of size n, and when does the worst case occur?',
      options: [
        { key: 'A', text: 'Average: O(n log n), Worst: O(n^2) when chosen pivots consistently partition into 0 and n-1 elements' },
        { key: 'B', text: 'Average: O(n), Worst: O(n log n) when array contains duplicate keys' },
        { key: 'C', text: 'Average: O(n log n), Worst: O(n^3) when recursive call stack overflows memory' },
        { key: 'D', text: 'Average: O(n^2), Worst: O(n!) when elements are already sorted in reverse order' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Average: O(n log n), Worst: O(n^2) when chosen pivots consistently partition into 0 and n-1 elements',
      explanation: 'Balanced partitions yield log n depth with n work per level (O(n log n)). Unbalanced partitions yield n levels of work (O(n^2)).'
    },
    {
      id: 'q_dsa_02',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'hard',
      question_text: 'In a Hash Table with separate chaining collision resolution, what happens to lookup time complexity if the hash function produces identical hash codes for all keys?',
      options: [
        { key: 'A', text: 'Degrades from O(1) average time to O(n) worst-case linear traversal along a single bucket chain' },
        { key: 'B', text: 'Remains strictly O(1) through automatic bit-shifting in the memory allocator' },
        { key: 'C', text: 'Triggers an irreversible O(log n) tree rebalancing exception' },
        { key: 'D', text: 'Forces memory reallocation with O(2^n) exponential expansion complexity' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Degrades from O(1) average time to O(n) worst-case linear traversal along a single bucket chain',
      explanation: 'When all keys collide into the same bucket, the hash table reduces to a standard singly linked list with O(n) search.'
    },
    {
      id: 'q_dsa_03',
      question_type: 'short_answer',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'medium',
      question_text: 'Explain why an ArrayList (dynamic array) provides O(1) amortized insertion time even though individual resize operations cost O(n) copy operations.',
      expected_answer: 'When capacity doubles from N to 2N, the previous N insertions paid for the resize. Spreading the O(N) copy cost across N insertions yields an average amortized cost of O(1) per append.',
      explanation: 'Geometric doubling ensures that expensive O(N) array copies happen infrequently enough that the average cost remains constant.'
    },
    {
      id: 'q_dsa_04',
      question_type: 'handwritten_derivation',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'hard',
      question_text: 'Using the Master Theorem or recursion tree method, derive the asymptotic runtime complexity of the recurrence relation: T(n) = 2T(n/2) + O(n). Write down each step clearly.',
      expected_answer: 'Using Master Theorem: a=2, b=2, f(n)=O(n). log_b(a) = log_2(2) = 1. Since f(n) = Theta(n^1), this falls into Case 2: T(n) = Theta(n^(log_b a) * log n) = Theta(n log n).',
      explanation: 'At each of the log2(n) levels of the recursion tree, the total work across all subproblems is exactly cn, yielding Theta(n log n).',
      rubric: [
        { criterion: 'Parameter Identification', points: 0.35, description: 'Identifies a=2, b=2, f(n)=n' },
        { criterion: 'Critical Exponent Calculation', points: 0.35, description: 'Computes log_2(2) = 1 and compares with polynomial power' },
        { criterion: 'Asymptotic Bound', points: 0.30, description: 'Arrives at Theta(n log n)' }
      ]
    },
    {
      id: 'q_dsa_05',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'medium',
      question_text: 'Which data structure allows finding the minimum element in O(1) time while supporting element insertion and deletion in O(log n) time?',
      options: [
        { key: 'A', text: 'Min-Heap (Priority Queue)' },
        { key: 'B', text: 'Unordered Singly Linked List' },
        { key: 'C', text: 'Circular Ring Buffer' },
        { key: 'D', text: 'Doubly Linked Queue' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Min-Heap (Priority Queue)',
      explanation: 'In a min-heap, the root always stores the smallest element (peek is O(1)), while bubble-up and bubble-down take O(log n).'
    },
    {
      id: 'q_dsa_06',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'hard',
      question_text: 'In Red-Black trees, what is the maximum possible height of a tree containing n internal nodes?',
      options: [
        { key: 'A', text: '2 * log_2(n + 1)' },
        { key: 'B', text: 'log_2(n)' },
        { key: 'C', text: 'n / 2' },
        { key: 'D', text: 'sqrt(n)' }
      ],
      correct_option: 'A',
      expected_answer: 'A: 2 * log_2(n + 1)',
      explanation: 'Because no red node can have a red child, the longest path (alternating red-black) is at most twice the shortest path (all black), guaranteeing O(log n) height.'
    },
    {
      id: 'q_dsa_07',
      question_type: 'short_answer',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'medium',
      question_text: 'Explain how a Bloom Filter operates, what types of false outcomes it can produce (false positive vs false negative), and why.',
      expected_answer: 'A Bloom filter uses a bit array of m bits and k independent hash functions. When adding an element, its k hashes set corresponding bits to 1. When querying, if all k bits are 1, it reports "probably present" (false positives possible due to hash collisions). If any bit is 0, it reports "definitely not present" (zero false negatives).',
      explanation: 'Bits can be set by other elements, causing false positives, but a 0 bit guarantees the element was never added.'
    },
    {
      id: 'q_dsa_08',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'easy',
      question_text: 'Which traversal of a Binary Search Tree (BST) visits nodes in strictly non-decreasing sorted order?',
      options: [
        { key: 'A', text: 'In-order Traversal (Left, Root, Right)' },
        { key: 'B', text: 'Pre-order Traversal (Root, Left, Right)' },
        { key: 'C', text: 'Post-order Traversal (Left, Right, Root)' },
        { key: 'D', text: 'Level-order Breadth-First Traversal' }
      ],
      correct_option: 'A',
      expected_answer: 'A: In-order Traversal (Left, Root, Right)',
      explanation: 'By the BST invariant, Left < Root < Right, so traversing Left, Root, Right produces monotonic sorted order.'
    },
    {
      id: 'q_dsa_09',
      question_type: 'handwritten_derivation',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'hard',
      question_text: 'Derive the amortized cost per operation for an initially empty Stack supporting PUSH, POP, and MULTIPOP(k) (which pops up to k elements) using the Aggregate or Potential method. Show why the average cost per operation is O(1).',
      expected_answer: 'Using the aggregate method: Each element can be popped at most once for each time it is pushed. A sequence of n operations can push at most n elements onto the stack. Therefore, the total number of pops (including inside MULTIPOP) across all n operations is at most n. Total time for n operations <= 2n. Amortized cost = 2n / n = O(1) per operation.',
      explanation: 'Even though an individual MULTIPOP(k) can take O(k) worst-case time, it can only pop elements that were previously pushed at O(1) each.',
      rubric: [
        { criterion: 'Push Invariant Analysis', points: 0.40, description: 'Notes that elements pushed at most once can be popped at most once' },
        { criterion: 'Total Work Bound', points: 0.35, description: 'Bounds total pops by total pushes <= n' },
        { criterion: 'Amortized Conclusion', points: 0.25, description: 'Concludes O(1) amortized bound' }
      ]
    },
    {
      id: 'q_dsa_10',
      question_type: 'mcq',
      topic: 'Data Structures & Big-O Complexity',
      difficulty: 'medium',
      question_text: 'Why do arrays typically achieve significantly faster linear iteration than singly linked lists of identical size on modern CPUs?',
      options: [
        { key: 'A', text: 'Contiguous memory layout maximizes CPU hardware cache line prefetching and spatial locality' },
        { key: 'B', text: 'Arrays use 16-bit register pointers whereas linked lists use 64-bit pointers' },
        { key: 'C', text: 'Linked lists require OS interrupt handlers on every pointer dereference' },
        { key: 'D', text: 'Arrays bypass virtual memory address translation' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Contiguous memory layout maximizes CPU cache prefetching and spatial locality',
      explanation: 'Arrays reside in contiguous memory; fetching one element pulls subsequent elements into L1/L2 cache lines, minimizing RAM latency.'
    }
  ],

  'Algorithm Design & Edge Cases': [
    {
      id: 'q_algo_01',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'medium',
      question_text: 'When implementing Binary Search on a sorted array of size n, why is computing mid as "mid = low + (high - low) / 2" safer than "mid = (low + high) / 2"?',
      options: [
        { key: 'A', text: 'Prevents 32-bit signed integer overflow when low + high exceeds 2^31 - 1' },
        { key: 'B', text: 'Forces memory alignment to 64-bit cache line boundaries' },
        { key: 'C', text: 'Ensures the compiler unrolls the comparison loop into SIMD instructions' },
        { key: 'D', text: 'Guarantees the mid pointer resolves to an even index offset' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Prevents 32-bit signed integer overflow when low + high exceeds 2^31 - 1',
      explanation: 'If low and high are large positive integers, (low + high) can overflow into a negative integer, causing an array index out of bounds error.'
    },
    {
      id: 'q_algo_02',
      question_type: 'short_answer',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'medium',
      question_text: 'Explain the Two-Pointer technique used in the classic "Two Sum II (Sorted Array)" problem and state its time and space complexity.',
      expected_answer: 'Place left pointer at start (0) and right pointer at end (n-1). If sum < target, advance left; if sum > target, decrement right. Takes O(n) time and O(1) auxiliary space without hash tables.',
      explanation: 'Sorted order guarantees that adjusting endpoints monotonically increases or decreases the pair sum.'
    },
    {
      id: 'q_algo_03',
      question_type: 'handwritten_derivation',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'hard',
      question_text: 'Write down the algorithm steps and state transition equation for solving the 0/1 Knapsack problem using Dynamic Programming. Clearly define the DP state DP[i][w].',
      expected_answer: 'State: DP[i][w] = max value using subset of first i items with weight capacity w. Transition: if weight[i] > w: DP[i][w] = DP[i-1][w]. Else: DP[i][w] = max(DP[i-1][w], DP[i-1][w - weight[i]] + value[i]). Base case: DP[0][w] = 0. Time: O(N*W), Space: O(N*W) or O(W).',
      explanation: 'Deciding whether to include or exclude item i gives the optimal substructure of 0/1 knapsack.',
      rubric: [
        { criterion: 'DP State Definition', points: 0.35, description: 'Defines subproblem state parameters clearly' },
        { criterion: 'Recurrence Relation', points: 0.40, description: 'Formulates max(include, exclude) transition' },
        { criterion: 'Base Cases & Complexity', points: 0.25, description: 'States base cases and O(N*W) pseudo-polynomial complexity' }
      ]
    },
    {
      id: 'q_algo_04',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'hard',
      question_text: 'What is the primary trade-off when using Breadth-First Search (BFS) versus Depth-First Search (DFS) to find the shortest path in an unweighted graph?',
      options: [
        { key: 'A', text: 'BFS guarantees finding the shortest path level-by-level, but requires O(V) queue memory compared to DFS O(D) call stack depth' },
        { key: 'B', text: 'DFS always finds the optimal path in half the time of BFS' },
        { key: 'C', text: 'BFS cannot be applied to directed graphs with cycles' },
        { key: 'D', text: 'DFS requires edge weights to be strictly positive prime numbers' }
      ],
      correct_option: 'A',
      expected_answer: 'A: BFS guarantees finding the shortest path level-by-level, but requires O(V) queue memory compared to DFS O(D) call stack depth',
      explanation: 'BFS explores nodes in order of increasing distance from source, guaranteeing shortest path in unweighted graphs at the expense of frontier queue space.'
    },
    {
      id: 'q_algo_05',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'medium',
      question_text: 'Which algorithm detects a cycle in a singly linked list in O(n) time and O(1) auxiliary memory space?',
      options: [
        { key: 'A', text: 'Floyd\'s Tortoise and Hare Cycle-Finding Algorithm (slow and fast pointers)' },
        { key: 'B', text: 'Tarjan\'s Strongly Connected Components Algorithm' },
        { key: 'C', text: 'Dijkstra\'s Shortest Path Algorithm' },
        { key: 'D', text: 'Kruskal\'s Minimum Spanning Forest Algorithm' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Floyd\'s Tortoise and Hare Cycle-Finding Algorithm',
      explanation: 'Slow moves 1 step and fast moves 2 steps. If a cycle exists, the fast pointer will eventually lap and meet the slow pointer.'
    },
    {
      id: 'q_algo_06',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'hard',
      question_text: 'Why does Dijkstra\'s algorithm fail to guarantee the shortest path on graphs containing negative edge weights?',
      options: [
        { key: 'A', text: 'Dijkstra greedily assumes that once a vertex is finalized from the priority queue, its distance can never be shortened by a subsequent path' },
        { key: 'B', text: 'Negative weights cause integer underflow exceptions in binary heaps' },
        { key: 'C', text: 'Dijkstra requires the graph adjacency matrix to be strictly symmetric' },
        { key: 'D', text: 'Fibonacci heaps cannot store negative priority keys' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Dijkstra greedily assumes finalized distances cannot be shortened by subsequent paths',
      explanation: 'Negative edges violate the greedy choice property; a longer path with a negative edge could end up cheaper than an already-finalized node.'
    },
    {
      id: 'q_algo_07',
      question_type: 'short_answer',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'medium',
      question_text: 'Explain the Sliding Window technique. How does it optimize problems like "Longest Substring Without Repeating Characters" from O(n^2) to O(n)?',
      expected_answer: 'Maintain two pointers (left and right) defining an active window. Expand right pointer while condition holds; if an invariant is violated (e.g. duplicate character), advance left pointer until valid again. Because each pointer visits each element at most once, total time is O(n) instead of re-evaluating all O(n^2) subarrays.',
      explanation: 'Sliding window reuses information from overlapping subarrays, amortizing pointer movement to linear time.'
    },
    {
      id: 'q_algo_08',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'medium',
      question_text: 'What is the time complexity of building a binary heap containing n elements from an arbitrary unordered array using the bottom-up Heapify (build_heap) procedure?',
      options: [
        { key: 'A', text: 'O(n)' },
        { key: 'B', text: 'O(n log n)' },
        { key: 'C', text: 'O(n^2)' },
        { key: 'D', text: 'O(log n)' }
      ],
      correct_option: 'A',
      expected_answer: 'A: O(n)',
      explanation: 'Summing (h / 2^h) over all tree levels converges to a constant, making bottom-up heap construction strictly linear O(n).'
    },
    {
      id: 'q_algo_09',
      question_type: 'handwritten_derivation',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'hard',
      question_text: 'Formulate the Longest Common Subsequence (LCS) recurrence relation for two strings X of length m and Y of length n. Define the DP table DP[i][j] and base cases.',
      expected_answer: 'DP[i][j] = length of LCS of X[1..i] and Y[1..j]. Base: DP[0][j] = 0, DP[i][0] = 0. Recurrence: If X[i] == Y[j]: DP[i][j] = 1 + DP[i-1][j-1]. Else: DP[i][j] = max(DP[i-1][j], DP[i][j-1]). Time: O(m*n), Space: O(m*n) or O(min(m,n)).',
      explanation: 'Characters matching extend the diagonal prefix by 1; differing characters branch into subproblems dropping either character.',
      rubric: [
        { criterion: 'Subproblem Definition', points: 0.35, description: 'Correctly defines DP[i][j] on string prefixes' },
        { criterion: 'Matching Case Recurrence', points: 0.35, description: 'Shows 1 + DP[i-1][j-1] when characters match' },
        { criterion: 'Mismatch Case & Base Case', points: 0.30, description: 'Shows max(DP[i-1][j], DP[i][j-1]) and zero boundaries' }
      ]
    },
    {
      id: 'q_algo_10',
      question_type: 'mcq',
      topic: 'Algorithm Design & Edge Cases',
      difficulty: 'easy',
      question_text: 'What algorithmic paradigm does MergeSort utilize to sort an array in O(n log n) time?',
      options: [
        { key: 'A', text: 'Divide and Conquer' },
        { key: 'B', text: 'Greedy Heuristic Selection' },
        { key: 'C', text: 'Dynamic Programming Memoization' },
        { key: 'D', text: 'Monte Carlo Randomized Approximation' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Divide and Conquer',
      explanation: 'MergeSort divides array into halves, recursively sorts each half, and conquers by merging two sorted halves in linear time.'
    }
  ],

  'Core Concepts & Foundations': [
    {
      id: 'q_core_01',
      question_type: 'mcq',
      topic: 'Core Concepts & Foundations',
      difficulty: 'easy',
      question_text: 'What is the primary distinction between Supervised Learning and Unsupervised Learning?',
      options: [
        { key: 'A', text: 'Supervised learning trains on labeled input-output pairs; unsupervised learning discovers hidden patterns in unlabeled data' },
        { key: 'B', text: 'Supervised learning only works on numerical data whereas unsupervised works on text' },
        { key: 'C', text: 'Unsupervised learning requires dedicated human feedback for every prediction' },
        { key: 'D', text: 'Supervised learning never incurs generalization error' }
      ],
      correct_option: 'A',
      expected_answer: 'A: Supervised learning trains on labeled input-output pairs; unsupervised discovers hidden patterns',
      explanation: 'Supervised learning relies on ground-truth target labels; unsupervised learning identifies intrinsic data geometry and clustering without labels.'
    },
    {
      id: 'q_core_02',
      question_type: 'short_answer',
      topic: 'Core Concepts & Foundations',
      difficulty: 'medium',
      question_text: 'Explain the Bias-Variance Tradeoff in machine learning models and how regularization affects each component.',
      expected_answer: 'High bias causes underfitting by oversimplifying assumptions. High variance causes overfitting by modeling noise in training data. Increasing regularization reduces model complexity, decreasing variance at the cost of slightly higher bias, optimizing generalization error.',
      explanation: 'Optimal model performance minimizes the sum of squared bias, variance, and irreducible noise.'
    },
    {
      id: 'q_core_03',
      question_type: 'mcq',
      topic: 'Core Concepts & Foundations',
      difficulty: 'medium',
      question_text: 'কম্পিউটার বিজ্ঞানে টাইম কমপ্লেক্সিটি O(1) দ্বারা কী বোঝায়?',
      options: [
        { key: 'A', text: 'অ্যালগরিদমের রানটাইম ইনপুটের সাইজ বৃদ্ধির সাথে অপরিবর্তিত বা ধ্রুবক থাকে' },
        { key: 'B', text: 'অ্যালগরিদমটি সবসময় ১ সেকেন্ডের মধ্যে শেষ হবে' },
        { key: 'C', text: 'প্রসেসরের মাত্র ১টি কোর ব্যবহৃত হবে' },
        { key: 'D', text: 'মেমোরিতে ১ বাইট জায়গা লাগবে' }
      ],
      correct_option: 'A',
      expected_answer: 'A: অ্যালগরিদমের রানটাইম ইনপুটের সাইজ বৃদ্ধির সাথে অপরিবর্তিত বা ধ্রুবক থাকে',
      explanation: 'O(1) নির্দেশ করে কনস্ট্যান্ট টাইম অপারেশন, যেখানে ডেটার আকার কোটি হলেও অপারেশনের সংখ্যা স্থির থাকে।'
    },
    {
      id: 'q_core_04',
      question_type: 'short_answer',
      topic: 'Core Concepts & Foundations',
      difficulty: 'easy',
      question_text: 'মেশিন লার্নিং মডেলে Overfitting বলতে কী বোঝায় এবং এটি প্রতিরোধের দুটি কার্যকরী উপায় লিখুন।',
      expected_answer: 'যখন মডেল ট্রেনিং ডেটার নয়েজ ও স্পেসিফিক প্যাটার্ন অতিরিক্ত মুখস্থ করে ফেলে এবং নতুন টেস্ট ডেটায় খারাপ ফল দেয়, তাকে Overfitting বলে। প্রতিরোধের উপায়: ১) Regularization (L1/L2 বা Dropout) ব্যবহার করা, ২) ডাটা অগমেন্টেশন বা আরও বেশি ট্রেনিং ডাটা সংগ্রহ করা।',
      explanation: 'মডেলের সাধারণীকরণ (generalization) ক্ষমতা কমে যাওয়া ওভারফিটিংয়ের প্রধান লক্ষণ।'
    },
    {
      id: 'q_core_05',
      question_type: 'handwritten_derivation',
      topic: 'Core Concepts & Foundations',
      difficulty: 'medium',
      question_text: 'গাণিতিক আরোহ বা Induction এর মাধ্যমে প্রমাণ করুন যে প্রথম n সংখ্যক স্বাভাবিক সংখ্যার যোগফল 1 + 2 + ... + n = n(n+1)/2। খাতায় প্রতিটি ধাপ স্পষ্ট করে লিখুন।',
      expected_answer: 'Base Case: n=1, 1 = 1(2)/2 = 1 (True). Inductive Hypothesis: ধরি n=k এর জন্য 1+2+...+k = k(k+1)/2 সত্য। Inductive Step: n=k+1 এর জন্য যোগফল = k(k+1)/2 + (k+1) = (k+1)[k/2 + 1] = (k+1)(k+2)/2। প্রমাণিত।',
      explanation: 'গাণিতিক আরোহের ভিত্তি ও আরোহী ধাপের নিখুঁত ধারাবাহিকতা যৌক্তিক দক্ষতার পরিচয় দেয়।',
      rubric: [
        { criterion: 'বেস কেস যাচাই (n = 1)', points: 0.30, description: 'সঠিকভাবে n=1 এর মান প্রমাণ' },
        { criterion: 'আরোহী অনুমান (Inductive Hypothesis)', points: 0.35, description: 'n=k এর জন্য সূত্রটির অনুমান স্থাপন' },
        { criterion: 'চূড়ান্ত প্রতিপাদন (n = k + 1)', points: 0.35, description: 'বীজগাণিতিক সরলীকরণের মাধ্যমে কাঙ্ক্ষিত ফল অর্জন' }
      ]
    }
  ]
};

// Map friendly topic aliases
CS_TOPIC_BANKS['Big-O Complexity'] = CS_TOPIC_BANKS['Data Structures & Big-O Complexity'];
CS_TOPIC_BANKS['Problem Solving & Invariants'] = CS_TOPIC_BANKS['Algorithm Design & Edge Cases'];
CS_TOPIC_BANKS['Algorithms & Invariants'] = CS_TOPIC_BANKS['Algorithm Design & Edge Cases'];
CS_TOPIC_BANKS['Trade-offs & Edge Cases'] = CS_TOPIC_BANKS['Algorithm Design & Edge Cases'];
CS_TOPIC_BANKS['System Architecture & Scalability'] = CS_TOPIC_BANKS['Data Structures & Big-O Complexity'];
CS_TOPIC_BANKS['All Chapters & Topics'] = CS_TOPIC_BANKS['Core Concepts & Foundations'];
CS_TOPIC_BANKS['সকল অধ্যায় ও সামগ্রিক বিষয়বস্তু'] = CS_TOPIC_BANKS['Core Concepts & Foundations'];

/**
 * Main adaptive quiz generation entry point
 */
export async function generateAdaptiveQuiz({
  docTitle,
  topicName,
  documentText = '',
  difficulty = 'medium',
  numQuestions = 5,
  geminiApiKey = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || ''
}) {
  const cleanTitle = cleanDocumentTitle(docTitle);
  const cleanTopic = cleanTopicString(topicName);
  const neededCount = Math.max(1, parseInt(numQuestions, 10) || 5);

  // Only use pre-baked CS banks if topic is explicitly in CS_TOPIC_BANKS and document is strictly a coding document
  const isCSMaterial = /\b(?:leetcode|dsa|data[\s_-]?structures?|algorithms?[\s_-]?design|cracking[\s_-]?the[\s_-]?coding)\b/i.test(docTitle);
  const isCSTopic = Boolean(CS_TOPIC_BANKS[cleanTopic]);
  const matchedBank = (!documentText && isCSTopic && isCSMaterial) ? CS_TOPIC_BANKS[cleanTopic] : null;
  
  if (matchedBank) {
    const shuffledBank = [...matchedBank].sort(() => Math.random() - 0.5);
    const randomizedQuestions = [];
    
    while (randomizedQuestions.length < neededCount) {
      for (const q of shuffledBank) {
        if (randomizedQuestions.length >= neededCount) break;
        const qCopy = JSON.parse(JSON.stringify(q));
        qCopy.id = `q_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        if (qCopy.question_type === 'mcq' && qCopy.options) {
          const shuffledResult = shuffleOptions(qCopy.options, qCopy.correct_option);
          qCopy.options = shuffledResult.options;
          qCopy.correct_option = shuffledResult.correctKey;
          qCopy.expected_answer = `${shuffledResult.correctKey}: ${qCopy.options.find(o => o.key === shuffledResult.correctKey)?.text || ''}`;
        }
        randomizedQuestions.push(qCopy);
      }
    }

    return {
      id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      title: `Assessment: ${cleanTopic}`,
      created_at: new Date().toISOString(),
      doc_title: cleanTitle,
      topic_focus: cleanTopic,
      difficulty,
      time_limit_minutes: Math.max(5, Math.round(neededCount * 2.5)),
      questions: randomizedQuestions.slice(0, neededCount)
    };
  }

  // If Gemini API Key provided, attempt high-fidelity LLM generation
  if (geminiApiKey && geminiApiKey.trim().length > 15 && documentText.length > 50) {
    try {
      const llmQuestions = await generateWithGeminiAPI({
        apiKey: geminiApiKey.trim(),
        docTitle: cleanTitle,
        topicName: cleanTopic,
        contextText: documentText,
        difficulty,
        count: neededCount
      });
      if (llmQuestions && llmQuestions.length >= neededCount) {
        return {
          id: `quiz_${Date.now()}`,
          title: `Assessment: ${cleanTopic}`,
          created_at: new Date().toISOString(),
          doc_title: cleanTitle,
          topic_focus: cleanTopic,
          difficulty,
          time_limit_minutes: Math.max(5, Math.round(neededCount * 2.5)),
          questions: llmQuestions.slice(0, neededCount)
        };
      }
    } catch (err) {
      console.warn('Gemini API call fallback to local semantic generator:', err);
    }
  }

  // Use robust, authentic local semantic question generator
  const generated = generateLocalContextualQuiz({
    docTitle: cleanTitle,
    topicName: cleanTopic,
    documentText,
    difficulty,
    count: neededCount
  });

  return {
    id: `quiz_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
    title: `Assessment: ${cleanTopic}`,
    created_at: new Date().toISOString(),
    doc_title: cleanTitle,
    topic_focus: cleanTopic,
    difficulty,
    time_limit_minutes: Math.max(5, Math.round(neededCount * 2.5)),
    questions: generated
  };
}

/**
 * Generate guaranteed count (5, 10, 15, 20+) questions directly from document sentences
 * with dynamic sentence windowing and randomization on every call.
 */
function generateLocalContextualQuiz({ docTitle, topicName, documentText, difficulty, count = 5 }) {
  const isBangla = /[\u0980-\u09FF]/.test(documentText || topicName || docTitle);
  const cleanContext = cleanRawText(documentText);

  // Extract candidate sentences and paragraphs with clean normalization
  const rawSentences = extractCleanSentences(cleanContext, isBangla);
  const rawParagraphs = extractCleanParagraphs(cleanContext, isBangla);

  const sentences = rawSentences.length > 0 ? rawSentences : [
    isBangla
      ? `"${docTitle}" এর "${topicName}" অংশের সামগ্রিক বিবরণ, মূল বিশ্লেষণ ও প্রধান পর্যবেক্ষণসমূহ`
      : `Core findings, observations, contextual evidence, and primary principles detailed in "${docTitle}" under ${topicName}`
  ];
  const paragraphs = rawParagraphs.length > 0 ? rawParagraphs : [
    cleanContext || (isBangla
      ? `"${docTitle}" এর "${topicName}" বিষয়ক গভীর তাত্ত্বিক এবং বাস্তবিক প্রেক্ষাপট বিশ্লেষণ।`
      : `Comprehensive analytical examination and documented outcomes for ${topicName} from "${docTitle}".`)
  ];

  // Randomize offset on every call so repeated generations produce different questions!
  const shuffledSentences = [...sentences].sort(() => Math.random() - 0.5);
  const shuffledParagraphs = [...paragraphs].sort(() => Math.random() - 0.5);

  const questions = [];
  const needed = Math.max(1, count);
  let idx = 0;

  while (questions.length < needed) {
    const qNum = questions.length + 1;
    const pattern = qNum % 5;
    const qId = `q_${Date.now()}_${qNum}_${Math.random().toString(36).substr(2, 4)}`;

    if (pattern === 1) {
      // 1. Fact verification MCQ
      const pivot = shuffledSentences[idx % shuffledSentences.length];
      const otherSentences = sentences.filter(s => s !== pivot);
      const d1 = otherSentences[0] ? truncateWords(otherSentences[0], 18) : createDomainDistractor(pivot, 1, isBangla);
      const d2 = otherSentences[1] ? truncateWords(otherSentences[1], 18) : createDomainDistractor(pivot, 2, isBangla);
      const d3 = otherSentences[2] ? truncateWords(otherSentences[2], 18) : createDomainDistractor(pivot, 3, isBangla);

      const opts = shuffleOptions([
        { key: 'A', text: truncateWords(pivot, 18) },
        { key: 'B', text: d1 },
        { key: 'C', text: d2 },
        { key: 'D', text: d3 }
      ], 'A');

      questions.push({
        id: qId,
        question_type: 'mcq',
        topic: topicName,
        difficulty,
        question_text: isBangla
          ? `"${docTitle}" এর "${topicName}" অংশের বিবরণ অনুযায়ী, নিচের কোন তথ্যটি সরাসরি সঠিক?`
          : `According to the discussion in "${docTitle}" under "${topicName}", which of the following statements is directly established?`,
        options: opts.options,
        correct_option: opts.correctKey,
        expected_answer: `${opts.correctKey}: ${truncateWords(pivot, 18)}`,
        explanation: isBangla
          ? `মূল টেক্সটে এই তথ্যটি সুনির্দিষ্টভাবে উল্লেখিত রয়েছে: "${truncateWords(pivot, 22)}"`
          : `This statement is directly verified in the source text: "${truncateWords(pivot, 22)}"`
      });
    } else if (pattern === 2) {
      // 2. Conceptual Short Answer from paragraph
      const para = shuffledParagraphs[idx % shuffledParagraphs.length];
      questions.push({
        id: qId,
        question_type: 'short_answer',
        topic: topicName,
        difficulty,
        question_text: isBangla
          ? `নিচের অংশটি মনোযোগ দিয়ে পড়ুন এবং এর কেন্দ্রীয় যুক্তি বা মূল বক্তব্য সংক্ষেপে নিজের ভাষায় লিখুন:\n\n> "${truncateWords(para, 45)}"`
          : `Carefully examine the following excerpt from "${docTitle}" and explain its central idea, purpose, and significance in your own words:\n\n> "${truncateWords(para, 45)}"`,
        expected_answer: isBangla
          ? `উদ্ধৃত অংশের মূল সারমর্ম, প্রেক্ষাপট এবং গভীর বিশ্লেষণমূলক বিবরণ।`
          : `A clear analytical synthesis explaining the premise, key mechanisms, and contextual implications.`,
        explanation: isBangla
          ? `ডকুমেন্টের মূল বক্তব্য অনুধাবন করে নিজের ভাষায় গুছিয়ে লেখার ক্ষমতা যাচাই করা হচ্ছে।`
          : `Synthesizing conceptual arguments validates genuine comprehension and active retention.`,
        rubric: isBangla
          ? [
              { criterion: 'মূল প্রতিপাদ্য শনাক্তকরণ', points: 0.50, description: 'প্রধান বক্তব্য সঠিকভাবে চিহ্নিত করেছে কিনা' },
              { criterion: 'বিশ্লেষণের স্পষ্টতা', points: 0.30, description: 'যৌক্তিক ও সুসংগঠিত বাক্যগঠন' },
              { criterion: 'ডকুমেন্ট প্রাসঙ্গিকতা', points: 0.20, description: 'মূল টেক্সটের সাথে সামঞ্জস্য' }
            ]
          : [
              { criterion: 'Core Thesis Identification', points: 0.50, description: 'Identifies central argument accurately' },
              { criterion: 'Analytical Clarity', points: 0.30, description: 'Coherent and structured reasoning' },
              { criterion: 'Contextual Alignment', points: 0.20, description: 'Faithful representation of source text' }
            ]
      });
    } else if (pattern === 3) {
      // 3. Step-by-step Handwritten Derivation
      const para = shuffledParagraphs[(idx + 1) % shuffledParagraphs.length];
      questions.push({
        id: qId,
        question_type: 'handwritten_derivation',
        topic: topicName,
        difficulty,
        question_text: isBangla
          ? `নিচের উদ্ধৃতাংশের উপর ভিত্তি করে মূল পয়েন্ট, গাণিতিক যুক্তি বা অ্যালগরিদমিক ধাপ খাতায় লিখে আপলোড করুন বা ক্যানভাসে আঁকুন:\n\n> "${truncateWords(para, 45)}"\n\n(কমপক্ষে ৩টি স্পষ্ট যৌক্তিক ধাপ উল্লেখ করুন)`
          : `Provide a structured step-by-step analysis, derivation, or proof based on this section of "${docTitle}". Write out your reasoning on paper or use the canvas:\n\n> "${truncateWords(para, 45)}"\n\n(Structure your derivation with at least 3 distinct analytical steps)`,
        expected_answer: isBangla
          ? `৩টি মূল দিক বা গাণিতিক/যৌক্তিক ধাপের স্পষ্ট বিবরণ এবং ধারাবাহিক বিশ্লেষণ।`
          : `Identification of 3 core analytical dimensions with coherent derivation steps.`,
        explanation: isBangla
          ? `হাতে লিখে বিশ্লেষণ করলে জটিল তত্ত্ব ও ধারণা স্মরণে দৃঢ় হয়।`
          : `Handwritten step-by-step proofs bridge passive reading into verified procedural mastery.`,
        rubric: isBangla
          ? [
              { criterion: 'মূল প্রতিপাদ্য শনাক্তকরণ', points: 0.40, description: 'প্রধান বক্তব্য সঠিকভাবে চিহ্নিত করেছে কিনা' },
              { criterion: 'যুক্তিভিত্তিক ধারাবাহিকতা', points: 0.35, description: 'ধাপগুলো যৌক্তিক ও সঙ্গতিপূর্ণ কিনা' },
              { criterion: 'উপস্থাপনের স্পষ্টতা', points: 0.25, description: 'পরিচ্ছন্ন হাতের লেখা ও সুসংগঠিত কাঠামো' }
            ]
          : [
              { criterion: 'Core Premise Identification', points: 0.40, description: 'Correctly identifies governing concepts' },
              { criterion: 'Analytical Continuity', points: 0.35, description: 'Shows coherent intermediate reasoning steps' },
              { criterion: 'Presentation Clarity', points: 0.25, description: 'Clean layout with organized structure' }
            ]
      });
    } else if (pattern === 4) {
      // 4. Trade-offs & Invariants MCQ
      const pivot = shuffledSentences[(idx + 1) % shuffledSentences.length];
      const d1 = createDomainDistractor(pivot, 1, isBangla);
      const d2 = createDomainDistractor(pivot, 2, isBangla);
      const d3 = createDomainDistractor(pivot, 3, isBangla);

      const opts = shuffleOptions([
        { key: 'A', text: truncateWords(pivot, 18) },
        { key: 'B', text: d1 },
        { key: 'C', text: d2 },
        { key: 'D', text: d3 }
      ], 'A');

      questions.push({
        id: qId,
        question_type: 'mcq',
        topic: topicName,
        difficulty,
        question_text: isBangla
          ? `আলোচ্য ধারণার বাস্তব প্রয়োগ ও সীমাবদ্ধতা সম্পর্কে নিচের কোনটি সর্বাপেক্ষা সঠিক?`
          : `Which of the following points accurately highlights an essential constraint or trade-off discussed in "${docTitle}"?`,
        options: opts.options,
        correct_option: opts.correctKey,
        expected_answer: `${opts.correctKey}: ${truncateWords(pivot, 18)}`,
        explanation: isBangla
          ? `বাস্তব প্রয়োগের ক্ষেত্রে এই পর্যবেক্ষণটি অত্যন্ত গুরুত্বপূর্ণ।`
          : `Understanding structural trade-offs prevents common architectural mistakes in production.`
      });
    } else {
      // 5. Contextual Implication Short Answer
      const sent = shuffledSentences[(idx + 2) % shuffledSentences.length];
      questions.push({
        id: qId,
        question_type: 'short_answer',
        topic: topicName,
        difficulty,
        question_text: isBangla
          ? `"${truncateWords(sent, 25)}" - এই পর্যবেক্ষণটির তাৎপর্য এবং বাস্তব সিস্টেমের উপর এর প্রভাব সংক্ষেপে ব্যাখ্যা করুন।`
          : `Explain the technical significance and broader implication of this observation:\n"${truncateWords(sent, 28)}"`,
        expected_answer: isBangla
          ? `উক্ত বক্তব্যের তাৎপর্য এবং সিস্টেমের পারফরম্যান্স বা ধারণার সাথে সম্পর্ক ব্যাখ্যা।`
          : `Evaluation of the architectural trade-offs and operational characteristics referenced.`,
        explanation: isBangla
          ? `গভীর অনুধাবন যাচাই করার জন্য এই প্রশ্নের অবতারণা।`
          : `Testing higher-order synthesis and engineering judgment.`
      });
    }

    idx++;
  }

  return questions.slice(0, needed);
}

/* ─── Helpers ─────────────────────────────────────────────── */

function cleanTopicString(str) {
  if (!str) return 'Core Concepts';
  return str
    .replace(/^Comprehensive Overview \((.*)\)$/i, '$1')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/\b(?:189|programming questions|solutions|edition|pdf|ebook|download|www\.[^\s]+)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Core Concepts';
}

function cleanRawText(text) {
  if (!text) return '';
  return text
    .replace(/--- Page \d+ ---/g, ' ')
    .replace(/www\.[a-z0-9.-]+\.[a-z]{2,}/gi, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractCleanSentences(text, isBangla) {
  if (!text) return [];
  const delimiter = isBangla ? /(?<=[।!?])\s+/ : /(?<=[.!?])\s+/;
  return text
    .split(delimiter)
    .map(s => s.trim().replace(/\s+/g, ' '))
    .filter(s => {
      const words = s.split(/\s+/).length;
      return words >= 5 && words <= 50;
    });
}

function extractCleanParagraphs(text, isBangla) {
  if (!text) return [];
  const raw = text.split(/\n{2,}|\.\s{2,}|।\s{2,}/);
  const filtered = raw
    .map(p => p.trim().replace(/\s+/g, ' '))
    .filter(p => {
      const words = p.split(/\s+/).length;
      return words >= 10 && words <= 100;
    });
  return filtered.length > 0 ? filtered : [text.slice(0, 500)];
}

function truncateWords(str, count) {
  if (!str) return '';
  const words = str.trim().split(/\s+/);
  if (words.length <= count) return str;
  return words.slice(0, count).join(' ') + '…';
}

function createDomainDistractor(baseSentence, variant, isBangla) {
  if (isBangla) {
    if (variant === 1) return `ঘটনাপ্রবাহে এই তথ্যের কোনো বাস্তব প্রমাণ মেলেনি`;
    if (variant === 2) return `উক্ত বক্তব্যের ফলাফল সম্পূর্ণ বিপরীতমুখী আচরণ প্রকাশ করে`;
    return `পূর্ববর্তী বিশ্লেষণের সাথে এই পর্যবেক্ষণের সরাসরি অমিল রয়েছে`;
  }

  if (variant === 1) {
    return 'Requires strictly linear space overhead due to uncompressed internal buffer allocations';
  }
  if (variant === 2) {
    return 'Incurs quadratic asymptotic degradation when input elements are pre-partitioned in reverse order';
  }
  return 'Violates the structural invariants required to maintain constant-time amortized bounds';
}

function shuffleOptions(options, originalCorrectKey) {
  const original = options.find(o => o.key === originalCorrectKey)?.text || options[0].text;
  const keys = ['A', 'B', 'C', 'D'];
  const shuffledTexts = options.map(o => o.text).sort(() => Math.random() - 0.5);
  const newOptions = keys.map((k, i) => ({ key: k, text: shuffledTexts[i] }));
  const newCorrectKey = newOptions.find(o => o.text === original)?.key || 'A';
  return { options: newOptions, correctKey: newCorrectKey };
}

/**
 * Optional Direct Gemini Flash integration for custom AI generation
 */
async function generateWithGeminiAPI({ apiKey, docTitle, topicName, contextText, difficulty, count }) {
  const isBangla = /[\u0980-\u09FF]/.test(contextText || topicName || docTitle);
  const promptLang = isBangla ? 'Bengali (বাংলা)' : 'English';

  const systemPrompt = `You are an expert AI Examiner.
Create a targeted ${count}-question quiz based STRICTLY on the provided study material.
Document Title: "${docTitle}"
Topic / Section: "${topicName}"
Difficulty: ${difficulty}
Language: You MUST generate ALL questions, options, answers, and rubrics strictly in ${promptLang}.

Material Excerpt:
${contextText.slice(0, 4000)}

Output Requirements:
Return a STRICT JSON array of question objects with this schema:
[
  {
    "question_type": "mcq" | "short_answer" | "handwritten_derivation",
    "topic": "${topicName}",
    "difficulty": "${difficulty}",
    "question_text": "question statement strictly in ${promptLang}",
    "options": [{"key": "A", "text": "..."}, {"key": "B", "text": "..."}, {"key": "C", "text": "..."}, {"key": "D", "text": "..."}],
    "correct_option": "A",
    "expected_answer": "complete model solution in ${promptLang}",
    "explanation": "explanation in ${promptLang}",
    "rubric": [
      {"criterion": "string", "points": 0.4, "description": "string"},
      {"criterion": "string", "points": 0.35, "description": "string"},
      {"criterion": "string", "points": 0.25, "description": "string"}
    ]
  }
]
Output ONLY raw JSON array. No markdown fences.`;

  const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-1.5-flash'];
  let res = null;
  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const attempt = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });
      if (attempt.ok) {
        res = attempt;
        break;
      }
    } catch {
      // try next model
    }
  }

  if (!res || !res.ok) {
    throw new Error(`Gemini API returned failure or unavailable model`);
  }

  const data = await res.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleanJson = rawText.replace(/```json\s*|```/g, '').trim();
  const parsed = JSON.parse(cleanJson);

  if (Array.isArray(parsed) && parsed.length >= count) {
    return parsed.slice(0, count).map((q, idx) => ({
      ...q,
      id: `q_gemini_${Date.now()}_${idx}`
    }));
  }
  return null;
}
