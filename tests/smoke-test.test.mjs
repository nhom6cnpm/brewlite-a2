import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateHealthPayload,
  validateProductsPayload,
  validateWebPayload,
} from '../scripts/smoke-test.mjs';

describe('Production Smoke Test Contract (CD-T01)', () => {
  describe('validateHealthPayload', () => {
    test('chấp nhận payload health { status: "ok" } không cần commit', () => {
      const err = validateHealthPayload({ status: 'ok' });
      assert.equal(err, null);
    });

    test('chấp nhận payload health khi commit trùng khớp', () => {
      const err = validateHealthPayload({ status: 'ok', commit: '3ce74b4' }, '3ce74b4');
      assert.equal(err, null);
    });

    test('từ chối khi commit deploy chưa khớp commit mong đợi (đang deploy bản cũ)', () => {
      const err = validateHealthPayload({ status: 'ok', commit: 'old-commit' }, 'new-commit');
      assert.ok(err && err.includes('chưa khớp commit mong đợi'));
    });

    test('từ chối khi status khác "ok"', () => {
      const err = validateHealthPayload({ status: 'error' });
      assert.ok(err && err.includes('Trường status không hợp lệ'));
    });

    test('từ chối khi payload rỗng hoặc không phải object', () => {
      assert.ok(validateHealthPayload(null));
      assert.ok(validateHealthPayload(''));
    });
  });

  describe('validateProductsPayload (Chuẩn A2)', () => {
    test('chấp nhận danh sách sản phẩm chuẩn A2 với ID dạng chuỗi (p1..p6 hoặc string)', () => {
      const products = [
        { id: 'p1', name: 'Americano', price: 30000 },
        { id: 'p2', name: 'Bạc xỉu', price: 32000 },
      ];
      const err = validateProductsPayload(products);
      assert.equal(err, null);
    });

    test('từ chối dữ liệu A1 có ID dạng số nguyên', () => {
      const a1Products = [
        { id: 1, name: 'Cà phê sữa đá', price: 29000 },
      ];
      const err = validateProductsPayload(a1Products);
      assert.ok(err && err.includes('Phát hiện ID sản phẩm dạng số (dữ liệu A1 cũ)'));
    });

    test('từ chối khi danh sách rỗng', () => {
      const err = validateProductsPayload([]);
      assert.ok(err && err.includes('rỗng'));
    });

    test('từ chối khi sản phẩm thiếu trường bắt buộc', () => {
      const err = validateProductsPayload([{ id: 'p1' }]);
      assert.ok(err && err.includes('thiếu các trường bắt buộc'));
    });
  });

  describe('validateWebPayload', () => {
    test('chấp nhận phản hồi HTTP 200 với HTML hợp lệ', () => {
      const html = '<!DOCTYPE html><html><head><title>BrewLite</title></head><body><h1>BrewLite</h1></body></html>';
      const err = validateWebPayload(html, 200);
      assert.equal(err, null);
    });

    test('từ chối khi status khác 200', () => {
      const err = validateWebPayload('Not Found', 404);
      assert.ok(err && err.includes('HTTP 404'));
    });

    test('từ chối khi nội dung trả về quá ngắn', () => {
      const err = validateWebPayload('Short', 200);
      assert.ok(err && err.includes('quá ngắn'));
    });
  });
});
