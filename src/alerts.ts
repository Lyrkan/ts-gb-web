import Swal from 'sweetalert2';

export const displayError = (message: string) => {
  Swal({
    type: 'error',
    title: 'Oops!',
    text: `An error occured:\n${message}`,
    // tslint:disable-next-line
    footer: '<a href="https://github.com/Lyrkan/ts-gb/issues" target="_blank">Open an issue on Github</a>'
  });
};

export const displayToast = (message: string) => {
  Swal({
    type: 'info',
    toast: true,
    position: 'top-end',
    html: message,
    timer: 3000,
  });
};
