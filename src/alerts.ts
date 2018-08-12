const errorContainer = document.getElementById('error');
const toastsContainer = document.getElementById('toasts');

if (errorContainer) {
  const closeButton = errorContainer.getElementsByClassName('close-button');
  if (closeButton.length > 0) {
    closeButton[0].addEventListener('click', () => {
      errorContainer.classList.remove('show');
    });
  }
}

export const displayError = (message: string) => {
  if (errorContainer) {
    errorContainer.classList.toggle('show', true);

    const messageDiv = errorContainer.getElementsByClassName('error-message');
    if (messageDiv.length > 0) {
      messageDiv[0].innerHTML = message;
    }
  }
};

export const displayToast = (message: string) => {
  if (toastsContainer) {
    const toastElement = document.createElement('div');
    toastElement.classList.add('toast');
    toastElement.innerHTML = message;

    toastsContainer.appendChild(toastElement);
    setTimeout(() => { toastElement.remove(); }, 4000);
  }
};
