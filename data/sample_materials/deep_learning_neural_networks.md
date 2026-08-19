# Deep Learning & Neural Networks: Comprehensive Study Notes

## 1. Fundamentals of Artificial Neural Networks (ANNs)
An Artificial Neural Network is a computational model inspired by the biological neural networks of animal brains. The basic building unit of a neural network is the **neuron** (or perceptron).

### Forward Propagation
A neuron computes a weighted sum of its inputs, adds a bias, and passes the result through an activation function:
$$z = \sum_{i=1}^n w_i x_i + b = W^T X + b$$
$$a = \sigma(z)$$

Where:
- $W$ is the weight matrix
- $X$ is the input vector
- $b$ is the bias vector
- $\sigma$ is a non-linear activation function

### Common Activation Functions
1. **Sigmoid**: $\sigma(z) = \frac{1}{1 + e^{-z}}$. Maps output to $(0, 1)$. Prone to the vanishing gradient problem for large $|z|$.
2. **ReLU (Rectified Linear Unit)**: $f(z) = \max(0, z)$. Computationally efficient and mitigates vanishing gradients, but can suffer from "Dying ReLU".
3. **Leaky ReLU**: $f(z) = \max(\alpha z, z)$ where $\alpha \approx 0.01$, preventing dead neurons.
4. **Softmax**: Used in multi-class classification output layers:
   $$\text{Softmax}(z_i) = \frac{e^{z_i}}{\sum_{j=1}^K e^{z_j}}$$

---

## 2. Loss Functions and Optimization

### Loss Functions
- **Mean Squared Error (MSE)** for regression:
  $$\mathcal{L}_{MSE} = \frac{1}{N}\sum_{i=1}^N (y_i - \hat{y}_i)^2$$
- **Binary Cross-Entropy (BCE)** for binary classification:
  $$\mathcal{L}_{BCE} = -\frac{1}{N}\sum_{i=1}^N \left[ y_i \log(\hat{y}_i) + (1 - y_i)\log(1 - \hat{y}_i) \right]$$
- **Categorical Cross-Entropy** for multi-class classification:
  $$\mathcal{L}_{CCE} = -\sum_{k=1}^K y_k \log(\hat{y}_k)$$

### Gradient Descent and Optimizers
Parameters $\theta$ are updated iteratively in the opposite direction of the gradient of the loss function:
$$\theta_{t+1} = \theta_t - \eta \nabla_\theta \mathcal{L}(\theta_t)$$
Where $\eta$ is the learning rate.

#### Advanced Optimizers:
1. **SGD with Momentum**: Accelerates gradients in the relevant direction and dampens oscillations by keeping an exponentially decaying moving average of past gradients:
   $$v_t = \gamma v_{t-1} + \eta \nabla_\theta \mathcal{L}(\theta)$$
   $$\theta_{t+1} = \theta_t - v_t$$
2. **Adam (Adaptive Moment Estimation)**: Combines Momentum (first moment $m_t$) and RMSprop (second uncentered moment $v_t$):
   $$m_t = \beta_1 m_{t-1} + (1-\beta_1) g_t$$
   $$v_t = \beta_2 v_{t-1} + (1-\beta_2) g_t^2$$
   $$\hat{m}_t = \frac{m_t}{1-\beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1-\beta_2^t}$$
   $$\theta_{t+1} = \theta_t - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$

---

## 3. Backpropagation Algorithm
Backpropagation is the application of the calculus **Chain Rule** to compute the gradient of the loss function with respect to each weight and bias in the network:
$$\frac{\partial \mathcal{L}}{\partial w_{ij}^{(l)}} = \frac{\partial \mathcal{L}}{\partial z_j^{(l)}} \cdot \frac{\partial z_j^{(l)}}{\partial w_{ij}^{(l)}} = \delta_j^{(l)} a_i^{(l-1)}$$
Where the error term $\delta_j^{(l)}$ for layer $l$ is propagated backwards:
$$\delta_j^{(l)} = \left( \sum_{k} \delta_k^{(l+1)} w_{jk}^{(l+1)} \right) \sigma'(z_j^{(l)})$$

---

## 4. Convolutional Neural Networks (CNNs)
CNNs are specialized for grid-structured data like images.
Key layers:
1. **Convolutional Layer**: Applies learnable filters/kernels $(K \times K)$ over the input volume with stride $S$ and padding $P$. Output spatial dimension:
   $$O = \frac{W - K + 2P}{S} + 1$$
2. **Pooling Layer (Max/Average Pooling)**: Reduces spatial dimensions to achieve translation invariance and decrease computational cost.
3. **Fully Connected (Dense) Layer**: Flattens feature maps to perform high-level classification.

---

## 5. Regularization Techniques
- **L2 Regularization (Weight Decay)**: Adds $\frac{\lambda}{2} \|W\|_2^2$ to loss, penalizing large weights.
- **Dropout**: Randomly sets a fraction $p$ of neuron activations to zero during training, preventing co-adaptation.
- **Batch Normalization**: Normalizes mini-batch activations to have zero mean and unit variance:
  $$\hat{x}^{(k)} = \frac{x^{(k)} - \mu_B}{\sqrt{\sigma_B^2 + \epsilon}}, \quad y^{(k)} = \gamma^{(k)}\hat{x}^{(k)} + \beta^{(k)}$$
