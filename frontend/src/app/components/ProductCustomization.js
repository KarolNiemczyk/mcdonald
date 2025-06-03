"use client";
import { useState } from 'react';

export default function ProductCustomization({ product, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  const [removeIngredients, setRemoveIngredients] = useState([]);
  const [addAdditives, setAddAdditives] = useState([]);

  const availableAdditives = [
    'Extra Cheese',
    'Bacon',
    'Extra Sauce',
    'Avocado'
  ];

  const handleRemoveToggle = (ingredientName) => {
    setRemoveIngredients(prev =>
      prev.includes(ingredientName)
        ? prev.filter(i => i !== ingredientName)
        : [...prev, ingredientName]
    );
  };

  const handleAdditiveToggle = (additive) => {
    setAddAdditives(prev =>
      prev.includes(additive)
        ? prev.filter(a => a !== additive)
        : [...prev, additive]
    );
  };

  const handleAddToCart = () => {
    const item = {
      product,
      quantity,
      customizations: {
        remove: removeIngredients,
        add: addAdditives
      }
    };
    onAddToCart(item);
    setQuantity(1);
    setRemoveIngredients([]);
    setAddAdditives([]);
  };

  return (
    <div className="border-2 border-yellow-400 rounded-lg p-6 bg-yellow-400 hover:shadow-lg transition">
      <h3 className="text-xl font-semibold text-black">{product.name}</h3>
      <p className="text-black font-medium">{product.price} PLN</p>
      <p className="text-black">
        Kalorie: {product.nutritional_info?.calories || 'Brak danych'}
      </p>
      <div className="mt-2">
        <label className="block text-red-600 font-medium">Ilość:</label>
        <input
          type="number"
          min="1"
          value={quantity}
          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
          className="w-16 p-1 border-2 border-red-600 rounded bg-white text-black"
        />
      </div>
      {product.ingredients && product.ingredients.length > 0 && (
        <div className="mt-2">
          <h4 className="text-red-600 font-medium">Usuń składniki:</h4>
          {product.ingredients.map(pi => (
            <label key={pi.ingredient.id} className="block text-black">
              <input
                type="checkbox"
                checked={removeIngredients.includes(pi.ingredient.name)}
                onChange={() => handleRemoveToggle(pi.ingredient.name)}
                className="mr-2"
              />
              {pi.ingredient.name}
            </label>
          ))}
        </div>
      )}
      <div className="mt-2">
        <h4 className="text-red-600 font-medium">Dodatki:</h4>
        {availableAdditives.map(additive => (
          <label key={additive} className="block text-black">
            <input
              type="checkbox"
              checked={addAdditives.includes(additive)}
              onChange={() => handleAdditiveToggle(additive)}
              className="mr-2"
            />
            {additive}
          </label>
        ))}
      </div>
      <button
        onClick={handleAddToCart}
        className="mt-4 w-full py-2 bg-red-600 text-white rounded-md hover:bg-red-800 transition font-semibold"
      >
        Dodaj do koszyka
      </button>
      {product.ingredients && product.ingredients.length > 0 && (
        <div className="mt-4">
          <h4 className="text-red-600 font-medium">Składniki:</h4>
          <ul className="list-disc list-inside text-black text-sm">
            {product.ingredients.map(pi => (
              <li key={pi.ingredient.id}>{pi.ingredient.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}