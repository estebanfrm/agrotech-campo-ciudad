import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import AdminPanel from "./pages/AdminPanel.jsx";
import Catalog from "./pages/Catalog.jsx";
import CreateOrder from "./pages/CreateOrder.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import MyOrders from "./pages/MyOrders.jsx";
import MyProducts from "./pages/MyProducts.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import ProductForm from "./pages/ProductForm.jsx";
import Register from "./pages/Register.jsx";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/catalogo" element={<Catalog />} />
        <Route path="/productos/:id" element={<ProductDetail />} />
        <Route
          path="/productos/nuevo"
          element={
            <ProtectedRoute roles={["productor"]}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/productos/:id/editar"
          element={
            <ProtectedRoute roles={["productor"]}>
              <ProductForm />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-productos"
          element={
            <ProtectedRoute roles={["productor"]}>
              <MyProducts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pedidos/nuevo/:productId"
          element={
            <ProtectedRoute roles={["comprador"]}>
              <CreateOrder />
            </ProtectedRoute>
          }
        />
        <Route
          path="/mis-pedidos"
          element={
            <ProtectedRoute roles={["comprador"]}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["administrador"]}>
              <AdminPanel />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Layout>
  );
}
