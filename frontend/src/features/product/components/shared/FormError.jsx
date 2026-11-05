const FormError = ({ error }) => {
  if (!error) return null;

  return <p className="mt-2 text-sm font-medium text-red-500">{error}</p>;
};

export default FormError;
